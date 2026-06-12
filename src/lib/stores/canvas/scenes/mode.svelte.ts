import type { WorkspaceMode } from '$lib/scenes/types'

type WorkspaceModeInput = {
  getActiveCanvasId: () => string
}

export function createWorkspaceModeStore({
  getActiveCanvasId
}: WorkspaceModeInput) {
  let mode = $state<WorkspaceMode>('editor')

  function loadModeState(id: string) {
    const stored =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(`canvas-mode-${id}`)
        : null

    mode = stored === 'scenes' ? 'scenes' : 'editor'
  }

  function setMode(next: WorkspaceMode) {
    mode = next
  }

  $effect(() => {
    const activeCanvasId = getActiveCanvasId()
    if (typeof localStorage !== 'undefined' && activeCanvasId) {
      localStorage.setItem(`canvas-mode-${activeCanvasId}`, mode)
    }
  })

  return {
    loadModeState,
    setMode,
    get mode() {
      return mode
    }
  }
}
