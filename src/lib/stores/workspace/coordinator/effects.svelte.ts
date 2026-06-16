import type { WorkspaceCoordinatorActions } from './actions.svelte'
import type { WorkspaceChildStores } from './child-stores.svelte'
import type { WorkspaceElementActions } from './element-actions'
import type { WorkspaceCoordinatorState } from './state.svelte'

type WorkspaceCoordinatorEffectsInput = {
  state: WorkspaceCoordinatorState
  stores: WorkspaceChildStores
  actions: WorkspaceCoordinatorActions
  elementActions: WorkspaceElementActions
}

export function installWorkspaceCoordinatorEffects({
  state,
  stores,
  actions,
  elementActions
}: WorkspaceCoordinatorEffectsInput) {
  $effect(() => {
    if (!state.canEdit() && state.selectedTool !== 'hand') {
      state.selectedTool = 'hand'
    }
  })

  // Scene/workflow modes keep the drawing layer passive: the hand tool turns
  // off the SVG's pointer events, so panning/zooming keep working untouched.
  $effect(() => {
    if (state.isAnonymousPublicViewer && stores.modeStore.mode !== 'editor') {
      stores.scenesStore.closeScene()
      stores.workflowsStore.clearFocusedWorkflow()
      stores.modeStore.setMode('editor')
      return
    }

    if (!state.workflowEnabled && stores.modeStore.mode === 'workflows') {
      stores.workflowsStore.clearFocusedWorkflow()
      stores.modeStore.setMode('editor')
      return
    }

    if (stores.modeStore.mode !== 'editor' && state.selectedTool !== 'hand') {
      state.selectedTool = 'hand'
    }
  })

  $effect(() => {
    if (stores.modeStore.mode === 'scenes') return
    if (state.selectedElementIds.size !== 1) return
    const [id] = state.selectedElementIds
    if (stores.scenesStore.scenes.some((s) => s.id === id)) {
      actions.handleModeChange('scenes')
    }
  })

  $effect(() => {
    if (stores.scenesStore.openScene && stores.modeStore.mode !== 'scenes') {
      actions.handleModeChange('scenes')
    }
  })

  $effect(() => {
    if (
      stores.workflowsStore.focusedWorkflowId &&
      stores.modeStore.mode !== 'workflows'
    ) {
      actions.handleModeChange('workflows')
    }
  })

  $effect(() => {
    const nextCanvasId = state.activeCanvasId
    if (!nextCanvasId || nextCanvasId === state.lastLoadedCanvasId) {
      return
    }

    state.lastLoadedCanvasId = nextCanvasId
    stores.historyStore.clear()
    state.selectedElementIds = new Set()
    state.sceneCursorStyle = null
    state.selectionStart = null
    state.selectionEnd = null
    state.currentPath = []
    state.draftShape = null
    state.draftConnector = null
    state.editingText = null
    state.sceneLiveMessages = {}
    stores.scenesStore.closeScene()
    stores.workflowsStore.clearFocusedWorkflow()
    stores.modeStore.loadModeState(nextCanvasId)
    if (state.isAnonymousPublicViewer) {
      stores.modeStore.setMode('editor')
    }
    stores.cameraStore.loadCameraState(nextCanvasId)
    if (state.isAnonymousPublicViewer) {
      stores.canvasesStore.setError(null)
      stores.scenesStore.setScenes([])
      stores.workflowsStore.setWorkflows([])
      return
    }

    void elementActions.loadCanvasElements(nextCanvasId)
    void stores.scenesStore.loadScenes(nextCanvasId)
    if (state.workflowEnabled) {
      void stores.workflowsStore.loadWorkflows(nextCanvasId)
    } else {
      stores.workflowsStore.setWorkflows([])
    }
  })

  $effect(() => {
    const wasText = state.selectedTool === 'text'
    return () => {
      if (wasText || !state.editingText) {
        return
      }

      stores.textEditorStore.commitText(state.editingText)
    }
  })
}
