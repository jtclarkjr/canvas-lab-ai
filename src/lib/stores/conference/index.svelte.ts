import { getContext, setContext } from 'svelte'
import { supabase } from '$lib/auth/session-store'
import type {
  CaptionLanguageCode,
  CaptionTextColor,
  CaptionTextSize
} from '$lib/conference/captions'
import { CALL_CHAT_TEXT_TOPIC } from '$lib/conference/call-chat'
import {
  getCallSession,
  reconcileCallSession,
  startCallTranscription
} from '$lib/conference/api'
import {
  isTerminalTranscriptStatus,
  mergeCallSessionRealtimeRow,
  transcriptReconciliationDelay,
  transcriptWatchdogKey,
  type CallSessionRealtimeRow
} from '$lib/conference/call-session-realtime'
import type {
  ConferenceFullscreenChatTab,
  ConferenceFullscreenPanel,
  ConferenceLayoutMode,
  ConferenceViewMode,
  Corner,
  DeviceKind
} from '$lib/conference/types'
import { createConferenceCallChatStore } from '$lib/stores/conference/call-chat.svelte'
import { createConferenceCaptionsStore } from '$lib/stores/conference/captions.svelte'
import { createConferenceDevicesStore } from '$lib/stores/conference/devices.svelte'
import { createConferenceRoomStore } from '$lib/stores/conference/room.svelte'
import { createConferenceStatusStore } from '$lib/stores/conference/status.svelte'
import { createConferenceViewStore } from '$lib/stores/conference/view.svelte'
import { toast } from '$lib/stores/shared/toast.svelte'

const CANVAS_CONFERENCE_CONTEXT = Symbol('canvas-conference-store')

type CanvasConferenceStoreInput = {
  getCanvasId: () => string
  getUserId: () => string
  getEnabled: () => boolean
}

// Coordinator composing the conference sub-stores (workspace-store pattern):
// room owns the LiveKit lifecycle, devices owns enumeration/selection,
// status owns the call-in-progress indicator for non-participants, and view
// owns PiP/bar/fullscreen placement.
export function createCanvasConferenceStore({
  getCanvasId,
  getUserId,
  getEnabled
}: CanvasConferenceStoreInput) {
  const view = createConferenceViewStore()
  let transcriptionStarting = $state(false)
  const reconciledWatchdogs = new Set<string>()
  const terminalDetailRequests = new Set<string>()

  // The wiring closures below reference stores declared later; they only
  // run after creation, so the late binding is safe.
  const devices = createConferenceDevicesStore({
    applyToRoom: (kind, deviceId) => room.applyDevice(kind, deviceId)
  })

  const status = createConferenceStatusStore({
    getCanvasId,
    getEnabled,
    isIdle: () => room.status === 'idle'
  })

  const room = createConferenceRoomStore({
    getCanvasId,
    getEnabled,
    devices,
    textStreamTopics: [CALL_CHAT_TEXT_TOPIC],
    onRosterChanged: () => {
      status.broadcastChanged()
      void status.refresh()
    },
    onCallEnded: () => {
      view.resetForCallEnd()
      devices.setSettingsOpen(false)
    },
    onDataReceived: (payload, participantIdentity, topic) =>
      captions.handleData(payload, participantIdentity, topic),
    onTextReceived: (stream) => callChat.handleText(stream)
  })

  const captions = createConferenceCaptionsStore({
    getCanvasId,
    getEnabled,
    room,
    devices
  })

  const callChat = createConferenceCallChatStore({
    getUserId,
    getEnabled,
    room,
    isVisible: () =>
      view.viewMode === 'fullscreen' &&
      view.fullscreenPanel === 'chat' &&
      view.fullscreenChatTab === 'call'
  })

  async function loadTerminalTranscript(sessionId: string, attempt: number) {
    const key = `${sessionId}:${attempt}`
    if (terminalDetailRequests.has(key)) return
    terminalDetailRequests.add(key)

    try {
      const response = await getCallSession(getCanvasId(), sessionId)
      if (room.callSession?.id === sessionId) {
        room.setCallSession(response.item)
      }
    } catch (error) {
      console.warn('[conference] could not load terminal transcript', error)
    }
  }

  function applyRealtimeSession(row: CallSessionRealtimeRow) {
    const current = room.callSession
    if (!current || current.id !== row.id) return

    const previousStatus = current.transcriptStatus
    const next = mergeCallSessionRealtimeRow(current, row)
    room.setCallSession(next)

    if (previousStatus === next.transcriptStatus) return
    if (next.transcriptStatus === 'active') {
      toast.show({ title: 'Transcription started' })
    } else if (next.transcriptStatus === 'ready') {
      toast.show({ title: 'Transcript is ready' })
    } else if (next.transcriptStatus === 'no_speech') {
      toast.show({
        title: 'No speech captured',
        description: 'No transcript or summary was created for this call.'
      })
    } else if (next.transcriptStatus === 'failed') {
      toast.show({
        title: 'Transcription failed',
        description: next.errorMessage ?? undefined,
        variant: 'error'
      })
    }

    if (isTerminalTranscriptStatus(next.transcriptStatus)) {
      void loadTerminalTranscript(next.id, next.transcriptAttempt)
    }
  }

  $effect(() => {
    const client = supabase
    const sessionId = room.callSession?.id
    if (!client || !sessionId || !getEnabled()) return

    const channel = client
      .channel(`call-session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_call_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => applyRealtimeSession(payload.new as CallSessionRealtimeRow)
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })

  $effect(() => {
    const session = room.callSession
    if (!session || !getEnabled()) return

    const delay = transcriptReconciliationDelay(session)
    const key = transcriptWatchdogKey(session)
    if (delay === null || reconciledWatchdogs.has(key)) return

    const timer = setTimeout(() => {
      reconciledWatchdogs.add(key)
      void reconcileCallSession(getCanvasId(), session.id)
        .then((response) => {
          if (room.callSession?.id === response.item.id) {
            room.setCallSession(response.item)
          }
        })
        .catch((error) =>
          console.warn('[conference] transcript reconciliation failed', error)
        )
    }, delay)

    return () => clearTimeout(timer)
  })

  async function startTranscription() {
    if (!room.callSession || transcriptionStarting) {
      return
    }

    transcriptionStarting = true
    try {
      const { item } = await startCallTranscription(getCanvasId())
      room.setCallSession(item)
      let title = 'Transcription requested'
      if (item.transcriptStatus === 'ready') title = 'Transcript is ready'
      if (item.transcriptStatus === 'active') title = 'Transcription started'
      if (item.transcriptStatus === 'no_speech') title = 'No speech captured'
      toast.show({ title })
    } catch (error) {
      toast.show({
        title: 'Could not start transcription',
        description:
          error instanceof Error
            ? error.message
            : 'The transcriber could not be started.',
        variant: 'error'
      })
    } finally {
      transcriptionStarting = false
    }
  }

  return {
    get enabled() {
      return getEnabled()
    },
    get userId() {
      return getUserId()
    },

    // Room / call state
    get status() {
      return room.status
    },
    get isInCall() {
      return room.isInCall
    },
    get participants() {
      return room.participants
    },
    get featured() {
      return room.featured
    },
    get remoteAudioParticipants() {
      return room.remoteAudioParticipants
    },
    get micEnabled() {
      return room.micEnabled
    },
    get camEnabled() {
      return room.camEnabled
    },
    get screenEnabled() {
      return room.screenEnabled
    },
    get canPlayAudio() {
      return room.canPlayAudio
    },
    get pinnedIdentity() {
      return room.pinnedIdentity
    },
    get backgroundEffect() {
      return room.backgroundEffect
    },
    get callSession() {
      return room.callSession
    },
    get callTranscriptionStatus() {
      return room.callSession?.transcriptStatus ?? 'not_requested'
    },
    get transcriptionStarting() {
      return transcriptionStarting
    },
    get virtualBgImage() {
      return room.virtualBgImage
    },
    get blurRadius() {
      return room.blurRadius
    },
    join: room.join,
    leave: room.leave,
    toggleMic: room.toggleMic,
    toggleCam: room.toggleCam,
    toggleScreenShare: room.toggleScreenShare,
    setBackground: room.setBackground,
    setBlurRadius: (value: number) => room.setBlurRadius(value),
    pin: room.pin,
    startAudio: room.startAudio,
    startTranscription,

    // Devices
    get devices() {
      return devices.devices
    },
    get activeDeviceIds() {
      return devices.activeDeviceIds
    },
    get hasMic() {
      return devices.hasMic
    },
    get hasCamera() {
      return devices.hasCamera
    },
    get settingsOpen() {
      return devices.settingsOpen
    },
    setSettingsOpen: (value: boolean) => devices.setSettingsOpen(value),
    switchDevice: (kind: DeviceKind, deviceId: string) =>
      devices.switchDevice(kind, deviceId),

    // Call-in-progress indicator (Slack-style join pill)
    get callActive() {
      return room.status !== 'idle' || status.active
    },
    get participantCount() {
      return room.status === 'idle' ? status.count : room.participants.length
    },

    // View placement
    get corner() {
      return view.corner
    },
    get chatOpen() {
      return view.chatOpen
    },
    get viewMode() {
      return view.viewMode
    },
    get fullscreenPanel() {
      return view.fullscreenPanel
    },
    get fullscreenChatTab() {
      return view.fullscreenChatTab
    },
    get layoutMode() {
      return view.layoutMode
    },
    setCorner: (value: Corner) => view.setCorner(value),
    setChatOpen: (value: boolean) => view.setChatOpen(value),
    setViewMode: (value: ConferenceViewMode) => view.setViewMode(value),
    toggleFullscreenPanel: (
      panel: Exclude<ConferenceFullscreenPanel, 'none'>
    ) => view.toggleFullscreenPanel(panel),
    setFullscreenChatTab: (tab: ConferenceFullscreenChatTab) =>
      view.setFullscreenChatTab(tab),
    setLayoutMode: (mode: ConferenceLayoutMode) => view.setLayoutMode(mode),

    // Ephemeral in-call chat
    get callChatEntries() {
      return callChat.entries
    },
    get callChatUnreadCount() {
      return callChat.unreadCount
    },
    sendCallChatMessage: (text: string) => callChat.send(text),
    retryCallChatMessage: (messageId: string) => callChat.retry(messageId),
    dismissCallChatMessage: (messageId: string) =>
      callChat.dismissFailed(messageId),
    markCallChatRead: () => callChat.markRead(),

    // Captions
    get captionsEnabled() {
      return captions.enabled
    },
    get captionsLanguage() {
      return captions.language
    },
    get captionTextSize() {
      return captions.textSize
    },
    get captionTextColor() {
      return captions.textColor
    },
    get captionsState() {
      return captions.sttState
    },
    get captionSegments() {
      return captions.segments
    },
    toggleCaptions: () => captions.toggle(),
    setCaptionsLanguage: (code: CaptionLanguageCode) =>
      captions.setLanguage(code),
    setCaptionTextSize: (size: CaptionTextSize) => captions.setTextSize(size),
    setCaptionTextColor: (color: CaptionTextColor) =>
      captions.setTextColor(color)
  }
}

export type CanvasConferenceStore = ReturnType<
  typeof createCanvasConferenceStore
>

export function provideCanvasConferenceStore(
  input: CanvasConferenceStoreInput
) {
  const store = createCanvasConferenceStore(input)
  setContext(CANVAS_CONFERENCE_CONTEXT, store)
  return store
}

export function useCanvasConferenceStore() {
  const store = getContext<CanvasConferenceStore | undefined>(
    CANVAS_CONFERENCE_CONTEXT
  )

  if (!store) {
    throw new Error('Canvas conference store was not provided.')
  }

  return store
}

// Non-throwing variant for components (like chat) that should work whether
// or not the conference feature is mounted around them.
export function useCanvasConferenceStoreOptional() {
  return getContext<CanvasConferenceStore | undefined>(
    CANVAS_CONFERENCE_CONTEXT
  )
}
