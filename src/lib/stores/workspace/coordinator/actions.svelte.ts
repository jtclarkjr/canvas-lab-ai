import type { Tool } from '$lib/canvas/types'
import type { WorkspaceMode } from '$lib/scenes/types'
import type { CanvasWorkspaceStoreInput } from '$lib/workspace/types'
import type { WorkspaceChildStores } from './child-stores.svelte'
import type { WorkspaceElementActions } from './element-actions'
import type {
  WorkspaceCoordinatorState,
  WorkspaceElements
} from './state.svelte'

type WorkspaceCoordinatorActionsInput = {
  state: WorkspaceCoordinatorState
  stores: WorkspaceChildStores
  elementActions: WorkspaceElementActions
}

export function createWorkspaceCoordinatorActions({
  state,
  stores,
  elementActions
}: WorkspaceCoordinatorActionsInput) {
  function setProps(next: CanvasWorkspaceStoreInput) {
    const canvasChanged = next.canvasId !== state.activeCanvasId

    state.canvasId = next.canvasId
    state.userId = next.userId
    state.userEmail = next.userEmail
    state.role = next.role ?? 'owner'
    state.isPublicViewer = next.isPublicViewer ?? false
    state.isAnonymousPublicViewer = next.isAnonymousPublicViewer ?? false
    state.canvasTitle = next.canvasTitle ?? ''
    state.workflowEnabled =
      !state.isAnonymousPublicViewer && (next.workflowEnabled ?? false)
    state.activeCanvasId = next.canvasId
    stores.canvasesStore.setCanvases(next.initialCanvases)

    if (canvasChanged) {
      elementActions.syncElements(next.initialElements ?? [])
      stores.scenesStore.setScenes(
        state.isAnonymousPublicViewer ? [] : (next.initialScenes ?? [])
      )
      stores.workflowsStore.setWorkflows(
        state.workflowEnabled && !state.isAnonymousPublicViewer
          ? (next.initialWorkflows ?? [])
          : []
      )
    } else if (!state.workflowEnabled || state.isAnonymousPublicViewer) {
      stores.workflowsStore.clearFocusedWorkflow()
      stores.workflowsStore.setWorkflows([])
      if (state.isAnonymousPublicViewer) {
        stores.scenesStore.closeScene()
        stores.scenesStore.setScenes([])
      }
    }
  }

  function setElements(next: WorkspaceElements) {
    state.setElements(next)
  }

  function screenToCanvasPoint(clientX: number, clientY: number) {
    return stores.screenToCanvasPoint(clientX, clientY)
  }

  function handleToolChange(tool: Tool) {
    if (state.selectedTool === 'text' && tool !== 'text' && state.editingText) {
      stores.textEditorStore.commitText(state.editingText)
    }
    state.selectedTool = tool
    state.sceneCursorStyle = null
    if (tool !== 'hand' && stores.modeStore.mode !== 'editor') {
      stores.workflowsStore.clearFocusedWorkflow()
      stores.modeStore.setMode('editor')
    }
  }

  function handleModeChange(nextMode: WorkspaceMode) {
    if (state.isAnonymousPublicViewer && nextMode !== 'editor') {
      return
    }

    if (nextMode === stores.modeStore.mode) {
      return
    }
    if (nextMode === 'workflows' && !state.workflowEnabled) {
      return
    }

    if (nextMode !== 'editor' && stores.modeStore.mode === 'editor') {
      state.toolBeforeScenesMode = state.selectedTool
      if (state.editingText) {
        stores.textEditorStore.commitText(state.editingText)
      }
    }

    if (nextMode !== 'workflows') {
      stores.workflowsStore.clearFocusedWorkflow()
    }

    // Deselect a scene element when leaving scenes mode so the single-click
    // auto-switch effect doesn't immediately re-enter scenes.
    if (nextMode !== 'scenes' && stores.modeStore.mode === 'scenes') {
      const [id] = state.selectedElementIds
      if (
        state.selectedElementIds.size === 1 &&
        stores.scenesStore.scenes.some((s) => s.id === id)
      ) {
        state.selectedElementIds = new Set()
      }
    }

    stores.modeStore.setMode(nextMode)

    if (nextMode === 'editor' && state.canEdit()) {
      state.selectedTool = state.toolBeforeScenesMode
    }
  }

  function handleWorkspaceKeydown(event: KeyboardEvent) {
    if (stores.scenesStore.openScene || stores.workflowsStore.focusedWorkflow) {
      return
    }
    stores.keyboardStore.handleWorkspaceKeydown(event)
  }

  function mount() {
    if (state.isAnonymousPublicViewer) {
      stores.canvasesStore.setError(null)
    } else {
      void stores.canvasesStore.loadCanvasesList()
    }
    window.addEventListener('keydown', handleWorkspaceKeydown)

    return () => {
      window.removeEventListener('keydown', handleWorkspaceKeydown)
    }
  }

  function handleViewportPointerDown(event: PointerEvent) {
    if (stores.modeStore.mode !== 'editor') {
      state.selectedElementIds = new Set()
      handleModeChange('editor')
    }
    stores.cameraStore.handleViewportPointerDown(event)
  }

  return {
    setProps,
    setElements,
    screenToCanvasPoint,
    handleToolChange,
    handleModeChange,
    handleWorkspaceKeydown,
    mount,
    handleViewportPointerDown
  }
}

export type WorkspaceCoordinatorActions = ReturnType<
  typeof createWorkspaceCoordinatorActions
>
