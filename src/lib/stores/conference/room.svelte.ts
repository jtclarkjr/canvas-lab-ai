import type { BackgroundProcessorWrapper } from '@livekit/track-processors'
import type { AudioTrack, Room, VideoTrack } from 'livekit-client'
import type {
  BackgroundEffect,
  ConferenceTextStream
} from '$lib/conference/types'
import { ApiClientError } from '$lib/api-client'
import { colorFromId } from '$lib/canvas/helpers/color-from-id'
import { fetchConferenceToken } from '$lib/conference/api'
import type { CallSession } from '$lib/conference/schema'
import {
  isRenderableVideoTrack,
  loadBgPrefs,
  pickFeatured,
  saveBgPrefs
} from '$lib/conference/helpers'
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
  textStreamTopics?: string[]
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
  onTextReceived?: (stream: ConferenceTextStream) => void
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
  kind: 'camera' | 'microphone' | 'screen',
  error: unknown
) {
  const name =
    error instanceof DOMException || error instanceof Error ? error.name : ''
  if (kind === 'screen') {
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Screen share was denied. Check your browser permissions.'
    }
    return 'Screen share could not be started.'
  }
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
  textStreamTopics = [],
  onRosterChanged,
  onCallEnded,
  onDataReceived,
  onTextReceived
}: ConferenceRoomInput) {
  let room: Room | null = null
  let roomCanvasId: string | null = null
  let lk: LiveKitModule | null = null

  let status = $state<ConferenceStatus>('idle')
  let participants = $state.raw<ConferenceParticipant[]>([])
  let micEnabled = $state(false)
  let camEnabled = $state(false)
  let screenEnabled = $state(false)
  let lastActiveSpeaker = $state<string | null>(null)
  let pinnedIdentity = $state<string | null>(null)
  let canPlayAudio = $state(true)
  let callSession = $state<CallSession | null>(null)
  const _bgPrefs = loadBgPrefs()
  let backgroundEffect = $state<BackgroundEffect>(_bgPrefs.effect)
  let virtualBgImage = $state<string | null>(_bgPrefs.imagePath)
  let blurRadius = $state(_bgPrefs.blurRadius)
  let blurProcessor: BackgroundProcessorWrapper | null = null
  let processorAttached = false

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
    participants = all.map((p) => {
      const videoTrack =
        p.getTrackPublication(livekit.Track.Source.Camera)?.videoTrack ?? null
      const screenSharePublication = p.getTrackPublication(
        livekit.Track.Source.ScreenShare
      )
      const screenShareTrack = screenSharePublication?.videoTrack ?? null
      const screenShareMuted = screenSharePublication?.isMuted ?? true
      let renderableScreenShareTrack: VideoTrack | null = null
      let audioTrack: AudioTrack | null = null

      if (isRenderableVideoTrack(screenShareTrack, screenShareMuted)) {
        renderableScreenShareTrack = screenShareTrack
      }

      if (p !== r.localParticipant) {
        audioTrack =
          p.getTrackPublication(livekit.Track.Source.Microphone)?.audioTrack ??
          null
      }

      return {
        identity: p.identity,
        sid: p.sid,
        name: p.name || p.identity,
        isLocal: p === r.localParticipant,
        isSpeaking: p.isSpeaking,
        micEnabled: p.isMicrophoneEnabled,
        camEnabled: p.isCameraEnabled,
        wantsCaptions: p.attributes?.captions === 'on',
        color: participantColor(p.metadata, p.identity),
        videoTrack,
        screenShareTrack: renderableScreenShareTrack,
        audioTrack
      }
    })

    micEnabled = r.localParticipant.isMicrophoneEnabled
    camEnabled = r.localParticipant.isCameraEnabled
    screenEnabled = r.localParticipant.isScreenShareEnabled

    if (
      lastActiveSpeaker &&
      !participants.some((p) => p.identity === lastActiveSpeaker)
    ) {
      lastActiveSpeaker = null
    }

    if (
      pinnedIdentity?.endsWith(':screen') &&
      !participants.some(
        (p) => `${p.identity}:screen` === pinnedIdentity && p.screenShareTrack
      )
    ) {
      pinnedIdentity = null
    }
  }

  function resetCallState() {
    status = 'idle'
    participants = []
    micEnabled = false
    camEnabled = false
    screenEnabled = false
    lastActiveSpeaker = null
    pinnedIdentity = null
    canPlayAudio = true
    callSession = null
    blurProcessor = null
    processorAttached = false
    onCallEnded()
  }

  function getLocalCameraTrack() {
    if (!room || !lk) return null
    return (
      room.localParticipant.getTrackPublication(lk.Track.Source.Camera)
        ?.videoTrack ?? null
    )
  }

  async function applyBackgroundEffect() {
    const track = getLocalCameraTrack()
    if (!track) return

    if (backgroundEffect === 'none') {
      if (processorAttached) {
        await track.stopProcessor()
        processorAttached = false
      }
      return
    }

    if (backgroundEffect === 'virtual' && !virtualBgImage) return

    const options =
      backgroundEffect === 'blur'
        ? ({ mode: 'background-blur', blurRadius } as const)
        : ({ mode: 'virtual-background', imagePath: virtualBgImage! } as const)

    const { BackgroundProcessor } = await import('@livekit/track-processors')
    if (!blurProcessor) {
      blurProcessor = BackgroundProcessor(options)
      await track.setProcessor(blurProcessor)
      processorAttached = true
    } else if (!processorAttached) {
      await blurProcessor.switchTo(options)
      await track.setProcessor(blurProcessor)
      processorAttached = true
    } else {
      await blurProcessor.switchTo(options)
    }
  }

  async function setBackground(effect: BackgroundEffect, imagePath?: string) {
    backgroundEffect = effect
    if (imagePath !== undefined) virtualBgImage = imagePath
    saveBgPrefs({
      effect: backgroundEffect,
      imagePath: virtualBgImage,
      blurRadius
    })
    await applyBackgroundEffect()
  }

  async function setBlurRadius(value: number) {
    blurRadius = value
    saveBgPrefs({
      effect: backgroundEffect,
      imagePath: virtualBgImage,
      blurRadius: value
    })
    if (backgroundEffect === 'blur' && blurProcessor && processorAttached) {
      await blurProcessor.switchTo({
        mode: 'background-blur',
        blurRadius: value
      })
    }
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
      const {
        token,
        url,
        callSession: joinedCallSession
      } = await fetchConferenceToken(canvasId)
      callSession = joinedCallSession
      const prefs = devices.activeDeviceIds

      const r = new livekit.Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { deviceId: prefs.audioinput },
        videoCaptureDefaults: { deviceId: prefs.videoinput }
      })

      for (const topic of textStreamTopics) {
        r.registerTextStreamHandler(topic, (reader, participantInfo) => {
          void (async () => {
            try {
              onTextReceived?.({
                topic,
                text: await reader.readAll(),
                streamId: reader.info.id,
                timestamp: reader.info.timestamp,
                attributes: reader.info.attributes ?? {},
                participantIdentity: participantInfo.identity
              })
            } catch {
              // Ignore interrupted streams; Call chat is ephemeral.
            }
          })()
        })
      }

      const resyncEvents = [
        livekit.RoomEvent.ParticipantConnected,
        livekit.RoomEvent.ParticipantDisconnected,
        livekit.RoomEvent.TrackSubscribed,
        livekit.RoomEvent.TrackUnpublished,
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
      r.on(livekit.RoomEvent.LocalTrackPublished, (pub) => {
        if (
          backgroundEffect !== 'none' &&
          pub.source === livekit.Track.Source.Camera &&
          pub.track
        ) {
          processorAttached = false
          void applyBackgroundEffect()
        }
      })
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

  async function toggleScreenShare() {
    const r = room
    if (!r) return
    try {
      await r.localParticipant.setScreenShareEnabled(
        !r.localParticipant.isScreenShareEnabled
      )
    } catch (error) {
      toast.show({
        title: 'Screen share failed',
        description: mediaFailureDescription('screen', error),
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

  async function sendText(
    topic: string,
    text: string,
    attributes: Record<string, string>
  ) {
    const r = room
    if (!r) {
      throw new Error('You are not connected to the call.')
    }
    return r.localParticipant.sendText(text, { topic, attributes })
  }

  async function setLocalAttributes(attributes: Record<string, string>) {
    await room?.localParticipant.setAttributes(attributes).catch(() => {})
  }

  function setCallSession(value: CallSession | null) {
    callSession = value
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
    get screenEnabled() {
      return screenEnabled
    },
    get canPlayAudio() {
      return canPlayAudio
    },
    get pinnedIdentity() {
      return pinnedIdentity
    },
    get backgroundEffect() {
      return backgroundEffect
    },
    get virtualBgImage() {
      return virtualBgImage
    },
    get blurRadius() {
      return blurRadius
    },
    get callSession() {
      return callSession
    },
    join,
    leave,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    setBackground,
    setBlurRadius,
    applyDevice,
    pin,
    startAudio,
    publishData,
    sendText,
    setLocalAttributes,
    setCallSession
  }
}

export type ConferenceRoomStore = ReturnType<typeof createConferenceRoomStore>
