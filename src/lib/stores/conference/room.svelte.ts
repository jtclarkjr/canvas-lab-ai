import type { Room } from 'livekit-client'
import { ApiClientError } from '$lib/api-client'
import { colorFromId } from '$lib/canvas/helpers/color-from-id'
import { fetchConferenceToken } from '$lib/conference/api'
import { pickFeatured } from '$lib/conference/helpers'
import type {
  ConferenceParticipant,
  ConferenceStatus,
  DeviceKind
} from '$lib/conference/types'
import { toast } from '$lib/stores/shared/toast.svelte'
import type { ConferenceDevicesStore } from '$lib/stores/conference/devices.svelte'

type ConferenceRoomInput = {
  getCanvasId: () => string
  getEnabled: () => boolean
  devices: ConferenceDevicesStore
  // Nudges other members (broadcast) and refreshes the idle indicator.
  onRosterChanged: () => void
  // Resets call-scoped UI state (view mode, panels, settings dialog).
  onCallEnded: () => void
  // Data-channel messages from other participants (captions ride here).
  onDataReceived?: (
    payload: Uint8Array,
    participantIdentity: string | undefined,
    topic: string | undefined
  ) => void
}

type LiveKitModule = typeof import('livekit-client')

function participantColor(metadata: string | undefined, identity: string) {
  if (metadata) {
    try {
      const parsed: unknown = JSON.parse(metadata)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as { color?: unknown }).color === 'string'
      ) {
        return (parsed as { color: string }).color
      }
    } catch {
      // Not our metadata shape (e.g. a future agent participant).
    }
  }
  return colorFromId(identity)
}

function mediaFailureDescription(
  kind: 'camera' | 'microphone',
  error: unknown
) {
  const name =
    error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return `No ${kind} was detected. Plug one in and try again.`
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return `Your browser blocked the ${kind}. Check its site permissions.`
  }
  return `The ${kind} could not be started.`
}

// Owns the LiveKit Room lifecycle. The live Room is an event emitter and
// must never be wrapped in $state; reactive consumers read snapshots
// rebuilt by syncFromRoom instead.
export function createConferenceRoomStore({
  getCanvasId,
  getEnabled,
  devices,
  onRosterChanged,
  onCallEnded,
  onDataReceived
}: ConferenceRoomInput) {
  let room: Room | null = null
  let roomCanvasId: string | null = null
  let lk: LiveKitModule | null = null

  let status = $state<ConferenceStatus>('idle')
  let participants = $state.raw<ConferenceParticipant[]>([])
  let micEnabled = $state(false)
  let camEnabled = $state(false)
  let lastActiveSpeaker = $state<string | null>(null)
  let pinnedIdentity = $state<string | null>(null)
  let canPlayAudio = $state(true)

  const isInCall = $derived(status === 'connected' || status === 'reconnecting')
  const featured = $derived(
    pickFeatured(participants, pinnedIdentity, lastActiveSpeaker)
  )
  const remoteAudioParticipants = $derived(
    participants.filter((p) => !p.isLocal && p.audioTrack !== null)
  )

  function syncFromRoom() {
    const r = room
    const livekit = lk
    if (!r || !livekit) {
      participants = []
      return
    }

    const all = [r.localParticipant, ...r.remoteParticipants.values()]
    participants = all.map((p) => ({
      identity: p.identity,
      sid: p.sid,
      name: p.name || p.identity,
      isLocal: p === r.localParticipant,
      isSpeaking: p.isSpeaking,
      micEnabled: p.isMicrophoneEnabled,
      camEnabled: p.isCameraEnabled,
      wantsCaptions: p.attributes?.captions === 'on',
      color: participantColor(p.metadata, p.identity),
      videoTrack:
        p.getTrackPublication(livekit.Track.Source.Camera)?.videoTrack ?? null,
      audioTrack:
        p === r.localParticipant
          ? null
          : (p.getTrackPublication(livekit.Track.Source.Microphone)
              ?.audioTrack ?? null)
    }))

    micEnabled = r.localParticipant.isMicrophoneEnabled
    camEnabled = r.localParticipant.isCameraEnabled

    if (
      lastActiveSpeaker &&
      !participants.some((p) => p.identity === lastActiveSpeaker)
    ) {
      lastActiveSpeaker = null
    }
  }

  function resetCallState() {
    status = 'idle'
    participants = []
    micEnabled = false
    camEnabled = false
    lastActiveSpeaker = null
    pinnedIdentity = null
    canPlayAudio = true
    onCallEnded()
  }

  async function join() {
    if (status !== 'idle' || !getEnabled()) {
      return
    }
    const canvasId = getCanvasId()
    if (!canvasId) {
      return
    }

    status = 'connecting'
    try {
      const livekit = await import('livekit-client')
      lk = livekit
      const { token, url } = await fetchConferenceToken(canvasId)
      const prefs = devices.activeDeviceIds

      const r = new livekit.Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { deviceId: prefs.audioinput },
        videoCaptureDefaults: { deviceId: prefs.videoinput }
      })

      const resyncEvents = [
        livekit.RoomEvent.ParticipantConnected,
        livekit.RoomEvent.ParticipantDisconnected,
        livekit.RoomEvent.TrackSubscribed,
        livekit.RoomEvent.TrackUnsubscribed,
        livekit.RoomEvent.TrackMuted,
        livekit.RoomEvent.TrackUnmuted,
        livekit.RoomEvent.LocalTrackPublished,
        livekit.RoomEvent.LocalTrackUnpublished,
        livekit.RoomEvent.ParticipantAttributesChanged
      ] as const
      for (const event of resyncEvents) {
        r.on(event, syncFromRoom)
      }
      r.on(
        livekit.RoomEvent.DataReceived,
        (payload, participant, _kind, topic) => {
          onDataReceived?.(payload, participant?.identity, topic)
        }
      )
      r.on(livekit.RoomEvent.ParticipantConnected, onRosterChanged)
      r.on(livekit.RoomEvent.ParticipantDisconnected, onRosterChanged)
      r.on(livekit.RoomEvent.ActiveSpeakersChanged, (speakers) => {
        // Empty means nobody is currently loud enough; keep the previous focus.
        const activeSpeaker = speakers[0]
        if (activeSpeaker) {
          lastActiveSpeaker = activeSpeaker.identity
        }
        syncFromRoom()
      })
      r.on(livekit.RoomEvent.Reconnecting, () => {
        status = 'reconnecting'
      })
      r.on(livekit.RoomEvent.Reconnected, () => {
        status = 'connected'
        syncFromRoom()
      })
      r.on(livekit.RoomEvent.AudioPlaybackStatusChanged, () => {
        canPlayAudio = r.canPlaybackAudio
      })
      r.on(livekit.RoomEvent.MediaDevicesChanged, () => {
        void onMediaDevicesChanged()
      })
      r.on(livekit.RoomEvent.Disconnected, (reason) => {
        handleDisconnected(reason)
      })

      await r.connect(url, token)
      room = r
      roomCanvasId = canvasId

      // Availability check before enabling media: a missing device becomes a
      // warning toast and a disabled toggle instead of a failed join.
      await devices.refresh()
      devices.warnMissing()

      const enabling: Array<Promise<unknown>> = []
      if (devices.hasMic) {
        enabling.push(
          r.localParticipant.setMicrophoneEnabled(true).catch((error) => {
            toast.show({
              title: 'Microphone unavailable',
              description: mediaFailureDescription('microphone', error),
              variant: 'error'
            })
          })
        )
      }
      if (devices.hasCamera) {
        enabling.push(
          r.localParticipant.setCameraEnabled(true).catch((error) => {
            toast.show({
              title: 'Camera unavailable',
              description: mediaFailureDescription('camera', error),
              variant: 'error'
            })
          })
        )
      }
      await Promise.allSettled(enabling)

      status = 'connected'
      syncFromRoom()
      onRosterChanged()
    } catch (error) {
      room?.removeAllListeners()
      void room?.disconnect().catch(() => {})
      room = null
      roomCanvasId = null
      resetCallState()
      toast.show({
        title: 'Could not join the call',
        description:
          error instanceof ApiClientError
            ? error.message
            : 'The connection failed. Try again.',
        variant: 'error'
      })
    }
  }

  async function onMediaDevicesChanged() {
    const hadMic = devices.hasMic
    const hadCamera = devices.hasCamera
    await devices.refresh()
    if (!room) {
      return
    }
    if (hadMic && !devices.hasMic) {
      toast.show({
        title: 'Microphone disconnected',
        description: 'Others cannot hear you until one is reconnected.',
        variant: 'error'
      })
    }
    if (hadCamera && !devices.hasCamera) {
      toast.show({
        title: 'Camera disconnected',
        description: 'Others cannot see you until one is reconnected.',
        variant: 'error'
      })
    }
    syncFromRoom()
  }

  function handleDisconnected(reason?: unknown) {
    const livekit = lk
    room?.removeAllListeners()
    room = null
    roomCanvasId = null
    resetCallState()

    if (livekit && reason === livekit.DisconnectReason.DUPLICATE_IDENTITY) {
      toast.show({
        title: 'Call moved to another tab',
        description: 'You joined this call from another window.'
      })
    } else {
      toast.show({ title: 'Call ended' })
    }
    onRosterChanged()
  }

  async function leave() {
    const r = room
    room = null
    roomCanvasId = null
    resetCallState()
    if (r) {
      r.removeAllListeners()
      await r.disconnect().catch(() => {})
      onRosterChanged()
    }
  }

  async function toggleMic() {
    const r = room
    if (!r || !devices.hasMic) {
      return
    }
    try {
      await r.localParticipant.setMicrophoneEnabled(
        !r.localParticipant.isMicrophoneEnabled
      )
    } catch (error) {
      toast.show({
        title: 'Microphone unavailable',
        description: mediaFailureDescription('microphone', error),
        variant: 'error'
      })
    }
    syncFromRoom()
  }

  async function toggleCam() {
    const r = room
    if (!r || !devices.hasCamera) {
      return
    }
    try {
      await r.localParticipant.setCameraEnabled(
        !r.localParticipant.isCameraEnabled
      )
    } catch (error) {
      toast.show({
        title: 'Camera unavailable',
        description: mediaFailureDescription('camera', error),
        variant: 'error'
      })
    }
    syncFromRoom()
  }

  async function applyDevice(kind: DeviceKind, deviceId: string) {
    if (!room) {
      return
    }
    await room.switchActiveDevice(kind, deviceId).catch(() => {
      toast.show({
        title: 'Could not switch device',
        variant: 'error'
      })
    })
  }

  function pin(identity: string) {
    pinnedIdentity = pinnedIdentity === identity ? null : identity
  }

  async function startAudio() {
    await room?.startAudio().catch(() => {})
  }

  function publishData(topic: string, payload: unknown) {
    const r = room
    if (!r) {
      return
    }
    void r.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify(payload)), {
        reliable: true,
        topic
      })
      .catch(() => {
        // Dropped data during a reconnect is acceptable for captions.
      })
  }

  async function setLocalAttributes(attributes: Record<string, string>) {
    await room?.localParticipant.setAttributes(attributes).catch(() => {})
  }

  // Leave any live call when the active canvas switches
  // (CanvasTitleSwitcher keeps these components mounted).
  let currentCanvasId: string | null = null
  $effect(() => {
    const canvasId = getCanvasId()
    if (canvasId === currentCanvasId) {
      return
    }
    currentCanvasId = canvasId
    if (room && roomCanvasId && roomCanvasId !== canvasId) {
      void leave()
      toast.show({
        title: 'Left the call',
        description: 'You switched canvases.'
      })
    }
  })

  // Belt and braces on top of livekit's own page-leave handling.
  $effect(() => {
    const onPageHide = () => {
      void room?.disconnect()
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      void leave()
    }
  })

  return {
    get status() {
      return status
    },
    get isInCall() {
      return isInCall
    },
    get participants() {
      return participants
    },
    get featured() {
      return featured
    },
    get remoteAudioParticipants() {
      return remoteAudioParticipants
    },
    get micEnabled() {
      return micEnabled
    },
    get camEnabled() {
      return camEnabled
    },
    get canPlayAudio() {
      return canPlayAudio
    },
    get pinnedIdentity() {
      return pinnedIdentity
    },
    join,
    leave,
    toggleMic,
    toggleCam,
    applyDevice,
    pin,
    startAudio,
    publishData,
    setLocalAttributes
  }
}

export type ConferenceRoomStore = ReturnType<typeof createConferenceRoomStore>
