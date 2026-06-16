import { hasConnectorBindingToAnyScene } from '$lib/canvas/diagram-utils'
import type { WorkflowFlowType } from '$lib/workflows/schema'
import type { WorkspaceCoordinatorActions } from './actions.svelte'
import type { WorkspaceChildStores } from './child-stores.svelte'
import type { WorkspaceCoordinatorState } from './state.svelte'

type WorkspaceFacadeInput = {
  state: WorkspaceCoordinatorState
  stores: WorkspaceChildStores
  actions: WorkspaceCoordinatorActions
}

export function createWorkspaceFacade({
  state,
  stores,
  actions
}: WorkspaceFacadeInput) {
  return {
    setProps: actions.setProps,
    setElements: actions.setElements,
    mount: actions.mount,
    saveTitle: stores.canvasesStore.saveTitle,
    saveVisibility: stores.canvasesStore.saveVisibility,
    handleToolChange: actions.handleToolChange,
    insertDiagramTemplate: stores.templeStore.insertDiagramTemplate,
    handleModeChange: actions.handleModeChange,
    createScene: stores.scenesStore.createSceneAtViewportCenter,
    createWorkflow: (flowType?: WorkflowFlowType) =>
      state.workflowEnabled
        ? stores.workflowsStore.createWorkflowAtViewportCenter(flowType)
        : null,
    patchScene: stores.scenesStore.patchScene,
    patchWorkflow: stores.workflowsStore.patchWorkflow,
    patchWorkflowDefinition: stores.workflowsStore.patchWorkflowDefinition,
    patchWorkflowYaml: stores.workflowsStore.patchWorkflowYaml,
    patchWorkflowNotes: stores.workflowsStore.patchWorkflowNotes,
    patchWorkflowSettings: stores.workflowsStore.patchWorkflowSettings,
    deleteScene: stores.scenesStore.deleteScene,
    deleteWorkflow: stores.workflowsStore.deleteWorkflow,
    canModifyScene: stores.scenesStore.canModifyScene,
    canModifyWorkflow: stores.workflowsStore.canModifyWorkflow,
    focusWorkflow: stores.workflowsStore.focusWorkflow,
    openSceneById: stores.scenesStore.openSceneById,
    closeOpenScene: stores.scenesStore.closeScene,
    clearFocusedWorkflow: stores.workflowsStore.clearFocusedWorkflow,
    broadcastSceneActivity: stores.sceneActivityStore.broadcastActivity,
    handleListStyleToggle: stores.textEditorStore.handleListStyleToggle,
    setTextFontSize: stores.formattingStore.setTextFontSize,
    toggleTextBold: stores.formattingStore.toggleTextBold,
    toggleTextItalic: stores.formattingStore.toggleTextItalic,
    toggleTextUnderline: stores.formattingStore.toggleTextUnderline,
    setTextColor: stores.formattingStore.setTextColor,
    setDrawWidth: stores.formattingStore.setDrawWidth,
    setDrawColor: stores.formattingStore.setDrawColor,
    setDrawStyle: stores.formattingStore.setDrawStyle,
    toggleHighlighter: stores.formattingStore.toggleHighlighter,
    setHighlighterOpacity: stores.formattingStore.setHighlighterOpacity,
    setShapeKind: stores.sceneStore.setShapeKind,
    setConnectorKind: stores.sceneStore.setConnectorKind,
    setDiagramFillColor: stores.sceneStore.setDiagramFillColor,
    setDiagramStrokeColor: stores.sceneStore.setDiagramStrokeColor,
    setDiagramStrokeWidth: stores.sceneStore.setDiagramStrokeWidth,
    setDiagramStrokeStyle: stores.sceneStore.setDiagramStrokeStyle,
    setDiagramOpacity: stores.sceneStore.setDiagramOpacity,
    setDiagramStartArrow: stores.sceneStore.setDiagramStartArrow,
    setDiagramEndArrow: stores.sceneStore.setDiagramEndArrow,
    arrangeSelectedElements: stores.sceneStore.arrangeSelectedElements,
    openShareDialog: stores.accessStore.openShareDialog,
    handleRequestResolved: stores.accessStore.handleRequestResolved,
    applyEditorValue: stores.textEditorStore.applyEditorValue,
    handleTextInputBlur: stores.textEditorStore.handleTextInputBlur,
    handleTextEditorKeydown: stores.textEditorStore.handleTextEditorKeydown,
    syncEditorSelection: stores.textEditorStore.syncEditorSelection,
    deleteSelectedElements: stores.sceneStore.deleteSelectedElements,
    handleUndo: stores.historyStore.handleUndo,
    handleRedo: stores.historyStore.handleRedo,
    zoomIn: stores.cameraStore.zoomIn,
    zoomOut: stores.cameraStore.zoomOut,
    resetView: stores.cameraStore.resetView,
    handleViewportPointerDown: actions.handleViewportPointerDown,
    handleViewportPointerMove: stores.cameraStore.handleViewportPointerMove,
    handleViewportPointerUp: stores.cameraStore.handleViewportPointerUp,
    handleTouchStart: stores.cameraStore.handleTouchStart,
    handleTouchMove: stores.cameraStore.handleTouchMove,
    handleTouchEnd: stores.cameraStore.handleTouchEnd,
    get rootStyle() {
      return stores.cameraStore.rootStyle
    },
    get canvases() {
      return stores.canvasesStore.canvases
    },
    get activeCanvasId() {
      return state.activeCanvasId
    },
    get currentCanvasTitle() {
      return stores.canvasesStore.currentCanvasTitle
    },
    get currentCanvasVisibility() {
      // Public viewers are not in the canvases list (it only covers owned +
      // member canvases), but their presence here proves the canvas is public.
      return state.isPublicViewer
        ? 'public'
        : stores.canvasesStore.currentCanvasVisibility
    },
    get isPublicViewer() {
      return state.isPublicViewer
    },
    get isAnonymousPublicViewer() {
      return state.isAnonymousPublicViewer
    },
    get canEdit() {
      return state.canEdit()
    },
    get canManageCanvas() {
      return state.canManageCanvas()
    },
    get workflowEnabled() {
      return state.workflowEnabled
    },
    get isLoadingCanvases() {
      return stores.canvasesStore.isLoading
    },
    get selectedTool() {
      return state.selectedTool
    },
    get displayTool() {
      if (state.selectedTool !== 'select') return state.selectedTool
      if (stores.sceneStore.hasShapeSelection) return 'shape'
      if (stores.sceneStore.hasConnectorSelection) return 'connector'
      if (stores.sceneStore.hasPathSelection) return 'pencil'
      return state.selectedTool
    },
    get role() {
      return state.role
    },
    get canvasIdForActions() {
      return state.activeCanvasId || state.canvasId
    },
    get displayMembers() {
      return stores.presenceStore.displayMembers
    },
    get shareDialogOpen() {
      return stores.accessStore.shareDialogOpen
    },
    set shareDialogOpen(open: boolean) {
      stores.accessStore.shareDialogOpen = open
    },
    get pendingRequests() {
      return stores.accessStore.pendingRequests
    },
    get textFormatting() {
      return stores.formattingStore.textFormatting
    },
    get activeListStyle() {
      return stores.textEditorStore.activeListStyle
    },
    get drawFormatting() {
      return stores.formattingStore.drawFormatting
    },
    get diagramFormatting() {
      return stores.formattingStore.diagramFormatting
    },
    get canvasesError() {
      return stores.canvasesStore.error
    },
    get camera() {
      return stores.cameraStore.camera
    },
    get editingText() {
      return state.editingText
    },
    get sceneElements() {
      return {
        paths: state.paths,
        currentPath: state.currentPath,
        textElements: state.textElements,
        shapes: state.shapes,
        connectors: state.isAnonymousPublicViewer
          ? state.connectors.filter(
              (connector) => !hasConnectorBindingToAnyScene(connector)
            )
          : state.connectors,
        scenes: state.isAnonymousPublicViewer ? [] : stores.scenesStore.scenes,
        draftShape: state.draftShape,
        draftConnector: state.draftConnector
      }
    },
    get sceneSelection() {
      return {
        selectedIds: state.selectedElementIds,
        start: state.selectionStart,
        end: state.selectionEnd
      }
    },
    get sceneHandlers() {
      return {
        pointerDown: stores.sceneStore.handleSvgPointerDown,
        pointerMove: stores.sceneStore.handleSvgPointerMove,
        pointerUp: stores.sceneStore.handleSvgPointerUp,
        doubleClick: stores.sceneStore.handleSvgDoubleClick
      }
    },
    get hasShapeSelection() {
      return stores.sceneStore.hasShapeSelection
    },
    get hasConnectorSelection() {
      return stores.sceneStore.hasConnectorSelection
    },
    get hasPathSelection() {
      return stores.sceneStore.hasPathSelection
    },
    get mode() {
      return stores.modeStore.mode
    },
    get scenes() {
      return state.isAnonymousPublicViewer ? [] : stores.scenesStore.scenes
    },
    get workflows() {
      return state.isAnonymousPublicViewer
        ? []
        : stores.workflowsStore.workflows
    },
    get scenesError() {
      return state.isAnonymousPublicViewer ? null : stores.scenesStore.error
    },
    get workflowsError() {
      return state.isAnonymousPublicViewer ? null : stores.workflowsStore.error
    },
    get isCreatingScene() {
      return stores.scenesStore.isCreatingScene
    },
    get isCreatingWorkflow() {
      return stores.workflowsStore.isCreatingWorkflow
    },
    get openScene() {
      if (state.isAnonymousPublicViewer) {
        return null
      }

      const open = stores.scenesStore.openScene
      if (!open) {
        return null
      }

      const scene = stores.scenesStore.getScene(open.sceneId)
      if (!scene) {
        return null
      }

      return { scene, originRect: open.originRect }
    },
    get sceneCardHandlers() {
      return {
        pointerDown: stores.scenesStore.handleCardPointerDown,
        pointerMove: stores.scenesStore.handleCardPointerMove,
        pointerUp: stores.scenesStore.handleCardPointerUp,
        pointerCancel: stores.scenesStore.handleCardPointerCancel,
        open: stores.scenesStore.handleCardOpen,
        resizePointerDown: stores.scenesStore.handleResizePointerDown,
        resizePointerMove: stores.scenesStore.handleResizePointerMove,
        resizePointerUp: stores.scenesStore.handleResizePointerUp,
        resizePointerCancel: stores.scenesStore.handleResizePointerCancel
      }
    },
    get workflowFrameHandlers() {
      return {
        pointerDown: stores.workflowsStore.handleFramePointerDown,
        pointerMove: stores.workflowsStore.handleFramePointerMove,
        pointerUp: stores.workflowsStore.handleFramePointerUp,
        pointerCancel: stores.workflowsStore.handleFramePointerCancel,
        resizePointerDown: stores.workflowsStore.handleResizePointerDown,
        resizePointerMove: stores.workflowsStore.handleResizePointerMove,
        resizePointerUp: stores.workflowsStore.handleResizePointerUp,
        resizePointerCancel: stores.workflowsStore.handleResizePointerCancel
      }
    },
    get focusedWorkflow() {
      return stores.workflowsStore.focusedWorkflow
    },
    get sceneActivity() {
      return stores.sceneActivityStore.activity
    },
    get sceneStreamingText() {
      return stores.sceneActivityStore.streamingText
    },
    get sceneLiveMessages() {
      return state.sceneLiveMessages
    },
    get sceneDocumentRevisions() {
      return stores.scenesStore.documentRevisions
    },
    get cursors() {
      return stores.presenceStore.cursors
    },
    get selectedCount() {
      return state.selectedElementIds.size
    },
    get canUndo() {
      return stores.historyStore.canUndo
    },
    get canRedo() {
      return stores.historyStore.canRedo
    }
  }
}
