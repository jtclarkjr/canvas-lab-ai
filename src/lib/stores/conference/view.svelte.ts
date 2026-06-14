import type {
  ConferenceFullscreenPanel,
  ConferenceLayoutMode,
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
  let layoutMode = $state<ConferenceLayoutMode>('auto')

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
    get layoutMode() {
      return layoutMode
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
    setLayoutMode(mode: ConferenceLayoutMode) {
      layoutMode = mode
    },
    // Corner and chat-open persist across calls by design; only the
    // call-scoped view state resets.
    resetForCallEnd() {
      viewMode = 'pip'
      fullscreenPanel = 'none'
      layoutMode = 'auto'
    }
  }
}

export type ConferenceViewStore = ReturnType<typeof createConferenceViewStore>
