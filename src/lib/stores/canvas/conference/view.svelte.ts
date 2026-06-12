import type {
  ConferenceFullscreenPanel,
  ConferenceViewMode,
  Corner
} from '$lib/conference/types'

// UI placement state for the call surfaces. Lives outside the components so
// it survives the PiP/fullscreen unmounting between mode switches.
export function createConferenceViewStore() {
  let corner = $state<Corner>('bottom-right')
  let chatOpen = $state(false)
  let viewMode = $state<ConferenceViewMode>('pip')
  let fullscreenPanel = $state<ConferenceFullscreenPanel>('none')

  return {
    get corner() {
      return corner
    },
    get chatOpen() {
      return chatOpen
    },
    get viewMode() {
      return viewMode
    },
    get fullscreenPanel() {
      return fullscreenPanel
    },
    setCorner(value: Corner) {
      corner = value
    },
    setChatOpen(value: boolean) {
      chatOpen = value
    },
    setViewMode(value: ConferenceViewMode) {
      viewMode = value
    },
    toggleFullscreenPanel(panel: Exclude<ConferenceFullscreenPanel, 'none'>) {
      fullscreenPanel = fullscreenPanel === panel ? 'none' : panel
    },
    // Corner and chat-open persist across calls by design; only the
    // call-scoped view state resets.
    resetForCallEnd() {
      viewMode = 'pip'
      fullscreenPanel = 'none'
    }
  }
}

export type ConferenceViewStore = ReturnType<typeof createConferenceViewStore>
