import { createWorkspaceModeStore } from '$lib/stores/scenes/mode.svelte'
import { createWorkspaceRealtimeScenesStore } from '$lib/stores/scenes/realtime-scenes.svelte'
import { createWorkspaceSceneActivityStore } from '$lib/stores/scenes/scene-activity.svelte'
import { createWorkspaceScenesStore } from '$lib/stores/scenes/scenes.svelte'
import { createWorkspaceRealtimeWorkflowsStore } from '$lib/stores/workflows/realtime-workflows.svelte'
import { createWorkspaceWorkflowsStore } from '$lib/stores/workflows/workflows.svelte'
import { createWorkspaceAccessStore } from '$lib/stores/workspace/access.svelte'
import { createWorkspaceCameraStore } from '$lib/stores/workspace/camera.svelte'
import { createWorkspaceCanvasesStore } from '$lib/stores/workspace/canvases.svelte'
import { createWorkspaceFormattingStore } from '$lib/stores/workspace/formatting.svelte'
import { createWorkspaceHistoryStore } from '$lib/stores/workspace/history.svelte'
import { createWorkspaceKeyboardStore } from '$lib/stores/workspace/keyboard.svelte'
import { createWorkspacePresenceStore } from '$lib/stores/workspace/presence.svelte'
import { createWorkspaceRealtimeElementsStore } from '$lib/stores/workspace/realtime-elements.svelte'
import { createWorkspaceSurfaceInteractionsStore } from '$lib/stores/workspace/surface-interactions/index.svelte'
import { createWorkspaceTempleStore } from '$lib/stores/workspace/temple.svelte'
import { createWorkspaceTextEditorStore } from '$lib/stores/workspace/text-editor.svelte'
import type { CanvasWorkspaceStoreInput } from '$lib/workspace/types'
import type { WorkspaceElementActions } from './element-actions'
import type { WorkspaceCoordinatorState } from './state.svelte'

type WorkspaceChildStoresInput = {
  state: WorkspaceCoordinatorState
  input: CanvasWorkspaceStoreInput
  elementActions: WorkspaceElementActions
}

export function createWorkspaceChildStores({
  state,
  input,
  elementActions
}: WorkspaceChildStoresInput) {
  function screenToCanvasPoint(clientX: number, clientY: number) {
    return cameraStore.screenToCanvasPoint(state.svgEl, clientX, clientY)
  }

  const cameraStore = createWorkspaceCameraStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getRootElement: () => state.rootEl,
    getSelectedTool: () => state.selectedTool,
    getCursorStyleOverride: () => state.sceneCursorStyle
  })
  const canvasesStore = createWorkspaceCanvasesStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getFallbackTitle: () => state.canvasTitle,
    initialCanvases: input.initialCanvases
  })
  const formattingStore = createWorkspaceFormattingStore()
  const historyStore = createWorkspaceHistoryStore({
    getUserId: () => state.userId,
    applyCommand: elementActions.applyCommand
  })
  const accessStore = createWorkspaceAccessStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getRole: () => state.role,
    getUserId: () => state.userId,
    getIsPublicViewer: () => state.isPublicViewer,
    getIsAnonymousPublicViewer: () => state.isAnonymousPublicViewer,
    canManageCanvas: () => state.canManageCanvas()
  })
  const presenceStore = createWorkspacePresenceStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getCanvasId: () => state.canvasId,
    getUserId: () => state.userId,
    getUserEmail: () => state.userEmail,
    getIsAnonymousUser: () => state.isAnonymousPublicViewer,
    screenToCanvasPoint
  })
  createWorkspaceRealtimeElementsStore({
    getActiveCanvasId: () =>
      state.isAnonymousPublicViewer ? '' : state.activeCanvasId,
    getEditingTextId: () => state.editingText?.id,
    hasElementOwner: (id) => state.elementOwners.has(id),
    setElementOwner: (id, ownerId) => state.elementOwners.set(id, ownerId),
    setPaths: (next) => state.setPaths(next),
    setTextElements: (next) => state.setTextElements(next),
    setShapes: (next) => state.setShapes(next),
    setConnectors: (next) => state.setConnectors(next)
  })
  const modeStore = createWorkspaceModeStore({
    getActiveCanvasId: () => state.activeCanvasId
  })
  const scenesStore = createWorkspaceScenesStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getUserId: () => state.userId,
    getRole: () => state.role,
    getRootElement: () => state.rootEl,
    getCameraScale: () => cameraStore.camera.scale,
    screenToCanvasPoint,
    initialScenes: state.initiallyAnonymousPublicViewer
      ? []
      : input.initialScenes
  })
  const workflowsStore = createWorkspaceWorkflowsStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getUserId: () => state.userId,
    getRole: () => state.role,
    getRootElement: () => state.rootEl,
    getCameraScale: () => cameraStore.camera.scale,
    screenToCanvasPoint,
    initialWorkflows:
      !state.initiallyAnonymousPublicViewer && input.workflowEnabled
        ? input.initialWorkflows
        : []
  })
  const sceneActivityStore = createWorkspaceSceneActivityStore({
    getActiveCanvasId: () =>
      state.isAnonymousPublicViewer ? '' : state.activeCanvasId,
    getUserId: () => state.userId,
    getUserName: () => state.userEmail ?? 'A collaborator'
  })
  createWorkspaceRealtimeScenesStore({
    getActiveCanvasId: () =>
      state.isAnonymousPublicViewer ? '' : state.activeCanvasId,
    isSceneBusy: scenesStore.isSceneBusy,
    setScenes: scenesStore.setScenes,
    onSceneDeleted: scenesStore.handleSceneDeletedRemotely,
    onDocumentEvent: (sceneId) => {
      scenesStore.bumpDocumentRevision(sceneId)
      state.sceneDocumentsStore.handleDocumentEvent(sceneId)
    },
    onMessageInsert: (message) => {
      const existing = state.sceneLiveMessages[message.sceneId] ?? []
      state.sceneLiveMessages = {
        ...state.sceneLiveMessages,
        [message.sceneId]: [
          ...existing.filter((entry) => entry.id !== message.id),
          message
        ]
      }
    }
  })
  createWorkspaceRealtimeWorkflowsStore({
    getActiveCanvasId: () =>
      state.workflowEnabled && !state.isAnonymousPublicViewer
        ? state.activeCanvasId
        : '',
    isWorkflowBusy: workflowsStore.isWorkflowBusy,
    setWorkflows: workflowsStore.setWorkflows,
    onWorkflowDeleted: workflowsStore.handleWorkflowDeletedRemotely
  })

  const textEditorStore = createWorkspaceTextEditorStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getUserId: () => state.userId,
    getTextInputEl: () => state.textInputEl,
    getTextElements: () => state.textElements,
    setTextElements: (next) => state.setTextElements(next),
    getShapes: () => state.shapes,
    setShapes: (next) => state.setShapes(next),
    getConnectors: () => state.connectors,
    setConnectors: (next) => state.setConnectors(next),
    getScenes: () => scenesStore.scenes,
    getEditingText: () => state.editingText,
    setEditingText: (next) => {
      state.editingText = next
    },
    getEditorSelection: () => state.editorSelection,
    setEditorSelection: (next) => {
      state.editorSelection = next
    },
    setElementOwner: (id, ownerId) => state.elementOwners.set(id, ownerId),
    formattingStore,
    addHistoryCommand: historyStore.addCommand,
    upsertElement: elementActions.upsertElement,
    deleteElement: elementActions.deleteElement
  })
  const sceneStore = createWorkspaceSurfaceInteractionsStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getUserId: () => state.userId,
    getSelectedTool: () => state.selectedTool,
    setSelectedTool: (tool) => {
      state.selectedTool = tool
    },
    canEdit: () => state.canEdit(),
    canModifyElement: (id) => state.canModifyElement(id),
    screenToCanvasPoint,
    getCameraScale: () => cameraStore.camera.scale,
    getPaths: () => state.paths,
    setPaths: (next) => state.setPaths(next),
    getTextElements: () => state.textElements,
    setTextElements: (next) => state.setTextElements(next),
    getShapes: () => state.shapes,
    setShapes: (next) => state.setShapes(next),
    getConnectors: () => state.connectors,
    setConnectors: (next) => state.setConnectors(next),
    getScenes: () => scenesStore.scenes,
    setScenes: scenesStore.setScenes,
    canModifyScene: scenesStore.canModifyScene,
    persistScenePatch: scenesStore.persistScenePatch,
    setTransformBusyScenes: scenesStore.setTransformBusyScenes,
    openSceneById: scenesStore.openSceneById,
    setDraftShape: (next) => {
      state.draftShape = next
    },
    setDraftConnector: (next) => {
      state.draftConnector = next
    },
    setHoverCursorStyle: (next) => {
      state.sceneCursorStyle = next
    },
    getCurrentPath: () => state.currentPath,
    setCurrentPath: (next) => {
      state.currentPath = next
    },
    getIsCurrentlyDrawing: () => state.isCurrentlyDrawing,
    setIsCurrentlyDrawing: (next) => {
      state.isCurrentlyDrawing = next
    },
    getSelectionStart: () => state.selectionStart,
    setSelectionStart: (next) => {
      state.selectionStart = next
    },
    getSelectionEnd: () => state.selectionEnd,
    setSelectionEnd: (next) => {
      state.selectionEnd = next
    },
    getIsSelecting: () => state.isSelecting,
    setIsSelecting: (next) => {
      state.isSelecting = next
    },
    getSelectedElementIds: () => state.selectedElementIds,
    setSelectedElementIds: (next) => {
      state.selectedElementIds = next
    },
    getEditingText: () => state.editingText,
    setEditingText: (next) => {
      state.editingText = next
    },
    setElementOwner: (id, ownerId) => state.elementOwners.set(id, ownerId),
    formattingStore,
    addHistoryCommand: historyStore.addCommand,
    upsertElement: elementActions.upsertElement,
    deleteElement: elementActions.deleteElement,
    commitText: textEditorStore.commitText,
    startShapeTextEditing: textEditorStore.startShapeTextEditing,
    startConnectorTextEditing: textEditorStore.startConnectorTextEditing,
    startTextEditingAtPosition: textEditorStore.startTextEditingAtPosition
  })
  const keyboardStore = createWorkspaceKeyboardStore({
    getEditingText: () => state.editingText,
    getSelectedTool: () => state.selectedTool,
    getCanUndo: () => historyStore.canUndo,
    getCanRedo: () => historyStore.canRedo,
    handleUndo: historyStore.handleUndo,
    handleRedo: historyStore.handleRedo,
    deleteSelectedElements: sceneStore.deleteSelectedElements,
    clearSelection: () => state.clearSelection()
  })
  const templeStore = createWorkspaceTempleStore({
    getActiveCanvasId: () => state.activeCanvasId,
    getUserId: () => state.userId,
    getRootElement: () => state.rootEl,
    getMode: () => modeStore.mode,
    canEdit: () => state.canEdit(),
    screenToCanvasPoint,
    getEditingText: () => state.editingText,
    commitText: textEditorStore.commitText,
    getDiagramFormatting: () => formattingStore.diagramFormatting,
    applyCommand: elementActions.applyCommand,
    addHistoryCommand: historyStore.addCommand,
    setElementOwner: (id, ownerId) => state.elementOwners.set(id, ownerId),
    setSelectedElementIds: (next) => {
      state.selectedElementIds = next
    },
    setSelectedTool: (tool) => {
      state.selectedTool = tool
    },
    setHoverCursorStyle: (next) => {
      state.sceneCursorStyle = next
    },
    setSelectionStart: (next) => {
      state.selectionStart = next
    },
    setSelectionEnd: (next) => {
      state.selectionEnd = next
    },
    setIsSelecting: (next) => {
      state.isSelecting = next
    },
    setCurrentPath: (next) => {
      state.currentPath = next
    },
    setDraftShape: (next) => {
      state.draftShape = next
    },
    setDraftConnector: (next) => {
      state.draftConnector = next
    }
  })

  return {
    screenToCanvasPoint,
    cameraStore,
    canvasesStore,
    formattingStore,
    historyStore,
    accessStore,
    presenceStore,
    modeStore,
    scenesStore,
    workflowsStore,
    sceneActivityStore,
    textEditorStore,
    sceneStore,
    keyboardStore,
    templeStore
  }
}

export type WorkspaceChildStores = ReturnType<typeof createWorkspaceChildStores>
