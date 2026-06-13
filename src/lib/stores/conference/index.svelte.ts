import { getContext, setContext } from 'svelte'
import type {
  CaptionLanguageCode,
  CaptionTextColor,
  CaptionTextSize
} from '$lib/conference/captions'
import type {
  ConferenceFullscreenPanel,
  ConferenceViewMode,
  Corner,
  DeviceKind
} from '$lib/conference/types'
import { createConferenceCaptionsStore } from '$lib/stores/conference/captions.svelte'
import { createConferenceDevicesStore } from '$lib/stores/conference/devices.svelte'
import { createConferenceRoomStore } from '$lib/stores/conference/room.svelte'
import { createConferenceStatusStore } from '$lib/stores/conference/status.svelte'
import { createConferenceViewStore } from '$lib/stores/conference/view.svelte'

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
    onRosterChanged: () => {
      status.broadcastChanged()
      void status.refresh()
    },
    onCallEnded: () => {
      view.resetForCallEnd()
      devices.setSettingsOpen(false)
    },
    onDataReceived: (payload, participantIdentity, topic) =>
      captions.handleData(payload, participantIdentity, topic)
  })

  const captions = createConferenceCaptionsStore({
    getCanvasId,
    getEnabled,
    room,
    devices
  })

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
    get canPlayAudio() {
      return room.canPlayAudio
    },
    get pinnedIdentity() {
      return room.pinnedIdentity
    },
    join: room.join,
    leave: room.leave,
    toggleMic: room.toggleMic,
    toggleCam: room.toggleCam,
    pin: room.pin,
    startAudio: room.startAudio,

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
    setCorner: (value: Corner) => view.setCorner(value),
    setChatOpen: (value: boolean) => view.setChatOpen(value),
    setViewMode: (value: ConferenceViewMode) => view.setViewMode(value),
    toggleFullscreenPanel: (
      panel: Exclude<ConferenceFullscreenPanel, 'none'>
    ) => view.toggleFullscreenPanel(panel),

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
