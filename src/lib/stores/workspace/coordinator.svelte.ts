import { invalidateAll } from '$app/navigation'
import { ApiClientError } from '$lib/canvas/api'
import {
  deleteElement as deleteElementApi,
  listElements,
  upsertElement as upsertElementApi
} from '$lib/workspace/api'
import { createApplyCommand } from '$lib/canvas/apply-command'
import type { Command } from '$lib/canvas/commands'
import { hasConnectorBindingToAnyScene } from '$lib/canvas/diagram-utils'
import { canvasElementsToDrawingState } from '$lib/workspace/element-mapping'
import type { CanvasElement, UpsertElementInput } from '$lib/workspace/schema'
import type { CanvasRole } from '$lib/canvas/roles'
import type {
  DiagramConnector,
  DiagramShape,
  EditingText,
  Path,
  Point,
  TextElement,
  Tool
} from '$lib/canvas/types'
import type { CanvasWorkspaceStoreInput } from '$lib/workspace/types'
import type { SceneMessage } from '$lib/scenes/schema'
import type { WorkspaceMode } from '$lib/scenes/types'
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
import { createWorkspaceTextEditorStore } from '$lib/stores/workspace/text-editor.svelte'

type WorkspaceElements = {
  rootEl: HTMLDivElement | null
  svgEl: SVGSVGElement | null
  textInputEl: HTMLTextAreaElement | null
}

export function createCanvasWorkspaceStore(input: CanvasWorkspaceStoreInput) {
  const initialDrawingState = canvasElementsToDrawingState(
    input.initialElements ?? []
  )

  let canvasId = $state(input.canvasId)
  let userId = $state(input.userId)
  let userEmail = $state<string | null | undefined>(input.userEmail)
  let role = $state<CanvasRole>(input.role ?? 'owner')
  let isPublicViewer = $state(input.isPublicViewer ?? false)
  const initiallyAnonymousPublicViewer = input.isAnonymousPublicViewer ?? false
  let isAnonymousPublicViewer = $state(initiallyAnonymousPublicViewer)
  let canvasTitle = $state(input.canvasTitle ?? '')
  let workflowEnabled = $state(
    !initiallyAnonymousPublicViewer && (input.workflowEnabled ?? false)
  )
  const sceneDocumentsStore = input.sceneDocumentsStore

  let rootEl = $state<HTMLDivElement | null>(null)
  let svgEl = $state<SVGSVGElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)

  let activeCanvasId = $state(input.canvasId)
  let selectedTool = $state<Tool>('select')
  let paths = $state<Path[]>(initialDrawingState.paths)
  let textElements = $state<TextElement[]>(initialDrawingState.textElements)
  let shapes = $state<DiagramShape[]>(initialDrawingState.shapes)
  let connectors = $state<DiagramConnector[]>(initialDrawingState.connectors)
  let currentPath = $state<Point[]>([])
  let draftShape = $state<DiagramShape | null>(null)
  let draftConnector = $state<DiagramConnector | null>(null)
  let isCurrentlyDrawing = $state(false)
  let selectionStart = $state<Point | null>(null)
  let selectionEnd = $state<Point | null>(null)
  let isSelecting = $state(false)
  let selectedElementIds = $state<Set<string>>(new Set())
  let sceneCursorStyle = $state<string | null>(null)
  let editingText = $state<EditingText | null>(null)
  let editorSelection = $state({ start: 0, end: 0 })
  let elementOwners = initialDrawingState.owners
  // Chat messages arriving over realtime, keyed by scene id, so viewers of
  // an open scene see other users' conversations appear live.
  let sceneLiveMessages = $state<Record<string, SceneMessage[]>>({})
  let toolBeforeScenesMode: Tool = 'select'

  let lastLoadedCanvasId = ''

  const cameraStore = createWorkspaceCameraStore({
    getActiveCanvasId: () => activeCanvasId,
    getRootElement: () => rootEl,
    getSelectedTool: () => selectedTool,
    getCursorStyleOverride: () => sceneCursorStyle
  })
  const canvasesStore = createWorkspaceCanvasesStore({
    getActiveCanvasId: () => activeCanvasId,
    getFallbackTitle: () => canvasTitle,
    initialCanvases: input.initialCanvases
  })
  const formattingStore = createWorkspaceFormattingStore()
  const historyStore = createWorkspaceHistoryStore({
    getUserId: () => userId,
    applyCommand
  })
  const accessStore = createWorkspaceAccessStore({
    getActiveCanvasId: () => activeCanvasId,
    getRole: () => role,
    getUserId: () => userId,
    getIsPublicViewer: () => isPublicViewer,
    getIsAnonymousPublicViewer: () => isAnonymousPublicViewer,
    canManageCanvas
  })
  const presenceStore = createWorkspacePresenceStore({
    getActiveCanvasId: () => activeCanvasId,
    getCanvasId: () => canvasId,
    getUserId: () => userId,
    getUserEmail: () => userEmail,
    getIsAnonymousUser: () => isAnonymousPublicViewer,
    screenToCanvasPoint
  })
  createWorkspaceRealtimeElementsStore({
    getActiveCanvasId: () => (isAnonymousPublicViewer ? '' : activeCanvasId),
    getEditingTextId: () => editingText?.id,
    hasElementOwner: (id) => elementOwners.has(id),
    setElementOwner: (id, ownerId) => elementOwners.set(id, ownerId),
    setPaths,
    setTextElements,
    setShapes,
    setConnectors
  })
  const modeStore = createWorkspaceModeStore({
    getActiveCanvasId: () => activeCanvasId
  })
  const scenesStore = createWorkspaceScenesStore({
    getActiveCanvasId: () => activeCanvasId,
    getUserId: () => userId,
    getRole: () => role,
    getRootElement: () => rootEl,
    getCameraScale: () => cameraStore.camera.scale,
    screenToCanvasPoint,
    initialScenes: initiallyAnonymousPublicViewer ? [] : input.initialScenes
  })
  const workflowsStore = createWorkspaceWorkflowsStore({
    getActiveCanvasId: () => activeCanvasId,
    getUserId: () => userId,
    getRole: () => role,
    getRootElement: () => rootEl,
    getCameraScale: () => cameraStore.camera.scale,
    screenToCanvasPoint,
    initialWorkflows:
      !initiallyAnonymousPublicViewer && input.workflowEnabled
        ? input.initialWorkflows
        : []
  })
  const sceneActivityStore = createWorkspaceSceneActivityStore({
    getActiveCanvasId: () => (isAnonymousPublicViewer ? '' : activeCanvasId),
    getUserId: () => userId,
    getUserName: () => userEmail ?? 'A collaborator'
  })
  createWorkspaceRealtimeScenesStore({
    getActiveCanvasId: () => (isAnonymousPublicViewer ? '' : activeCanvasId),
    isSceneBusy: scenesStore.isSceneBusy,
    setScenes: scenesStore.setScenes,
    onSceneDeleted: scenesStore.handleSceneDeletedRemotely,
    onDocumentEvent: (sceneId) => {
      scenesStore.bumpDocumentRevision(sceneId)
      sceneDocumentsStore.handleDocumentEvent(sceneId)
    },
    onMessageInsert: (message) => {
      const existing = sceneLiveMessages[message.sceneId] ?? []
      sceneLiveMessages = {
        ...sceneLiveMessages,
        [message.sceneId]: [
          ...existing.filter((entry) => entry.id !== message.id),
          message
        ]
      }
    }
  })
  createWorkspaceRealtimeWorkflowsStore({
    getActiveCanvasId: () =>
      workflowEnabled && !isAnonymousPublicViewer ? activeCanvasId : '',
    isWorkflowBusy: workflowsStore.isWorkflowBusy,
    setWorkflows: workflowsStore.setWorkflows,
    onWorkflowDeleted: workflowsStore.handleWorkflowDeletedRemotely
  })

  function setProps(next: CanvasWorkspaceStoreInput) {
    const canvasChanged = next.canvasId !== activeCanvasId

    canvasId = next.canvasId
    userId = next.userId
    userEmail = next.userEmail
    role = next.role ?? 'owner'
    isPublicViewer = next.isPublicViewer ?? false
    isAnonymousPublicViewer = next.isAnonymousPublicViewer ?? false
    canvasTitle = next.canvasTitle ?? ''
    workflowEnabled =
      !isAnonymousPublicViewer && (next.workflowEnabled ?? false)
    activeCanvasId = next.canvasId
    canvasesStore.setCanvases(next.initialCanvases)

    if (canvasChanged) {
      syncElements(next.initialElements ?? [])
      scenesStore.setScenes(
        isAnonymousPublicViewer ? [] : (next.initialScenes ?? [])
      )
      workflowsStore.setWorkflows(
        workflowEnabled && !isAnonymousPublicViewer
          ? (next.initialWorkflows ?? [])
          : []
      )
    } else if (!workflowEnabled || isAnonymousPublicViewer) {
      workflowsStore.clearFocusedWorkflow()
      workflowsStore.setWorkflows([])
      if (isAnonymousPublicViewer) {
        scenesStore.closeScene()
        scenesStore.setScenes([])
      }
    }
  }

  function setElements(next: WorkspaceElements) {
    rootEl = next.rootEl
    svgEl = next.svgEl
    textInputEl = next.textInputEl
  }

  function canEdit() {
    return role !== 'reader'
  }

  function canManageCanvas() {
    return role === 'owner' || role === 'admin'
  }

  function canModifyElement(id: string) {
    if (role === 'owner' || role === 'admin') {
      return true
    }
    return role === 'editor' && elementOwners.get(id) === userId
  }

  function clearSelection() {
    selectedElementIds = new Set()
    selectionStart = null
    selectionEnd = null
    isSelecting = false
  }

  function setPaths(next: Path[] | ((previous: Path[]) => Path[])) {
    paths = typeof next === 'function' ? next(paths) : next
  }

  function setTextElements(
    next: TextElement[] | ((previous: TextElement[]) => TextElement[])
  ) {
    textElements = typeof next === 'function' ? next(textElements) : next
  }

  function setShapes(
    next: DiagramShape[] | ((previous: DiagramShape[]) => DiagramShape[])
  ) {
    shapes = typeof next === 'function' ? next(shapes) : next
  }

  function setConnectors(
    next:
      | DiagramConnector[]
      | ((previous: DiagramConnector[]) => DiagramConnector[])
  ) {
    connectors = typeof next === 'function' ? next(connectors) : next
  }

  function screenToCanvasPoint(clientX: number, clientY: number): Point {
    return cameraStore.screenToCanvasPoint(svgEl, clientX, clientY)
  }

  const upsertElement = {
    mutate(
      variables: UpsertElementInput,
      options?: { onError?: (error: unknown) => void }
    ) {
      void upsertElementApi(variables).catch((error) => {
        options?.onError?.(error)
      })
    }
  }

  const deleteElement = {
    mutate(
      variables: { id: string },
      options?: { onError?: (error: unknown) => void }
    ) {
      if (!activeCanvasId) {
        return
      }

      void deleteElementApi(activeCanvasId, variables.id).catch((error) => {
        options?.onError?.(error)
      })
    }
  }

  const textEditorStore = createWorkspaceTextEditorStore({
    getActiveCanvasId: () => activeCanvasId,
    getUserId: () => userId,
    getTextInputEl: () => textInputEl,
    getTextElements: () => textElements,
    setTextElements,
    getShapes: () => shapes,
    setShapes,
    getConnectors: () => connectors,
    setConnectors,
    getScenes: () => scenesStore.scenes,
    getEditingText: () => editingText,
    setEditingText: (next) => {
      editingText = next
    },
    getEditorSelection: () => editorSelection,
    setEditorSelection: (next) => {
      editorSelection = next
    },
    setElementOwner: (id, ownerId) => elementOwners.set(id, ownerId),
    formattingStore,
    addHistoryCommand: historyStore.addCommand,
    upsertElement,
    deleteElement
  })
  const sceneStore = createWorkspaceSurfaceInteractionsStore({
    getActiveCanvasId: () => activeCanvasId,
    getUserId: () => userId,
    getSelectedTool: () => selectedTool,
    setSelectedTool: (tool) => {
      selectedTool = tool
    },
    canEdit,
    canModifyElement,
    screenToCanvasPoint,
    getCameraScale: () => cameraStore.camera.scale,
    getPaths: () => paths,
    setPaths,
    getTextElements: () => textElements,
    setTextElements,
    getShapes: () => shapes,
    setShapes,
    getConnectors: () => connectors,
    setConnectors,
    getScenes: () => scenesStore.scenes,
    setScenes: scenesStore.setScenes,
    canModifyScene: scenesStore.canModifyScene,
    persistScenePatch: scenesStore.persistScenePatch,
    setTransformBusyScenes: scenesStore.setTransformBusyScenes,
    openSceneById: scenesStore.openSceneById,
    setDraftShape: (next) => {
      draftShape = next
    },
    setDraftConnector: (next) => {
      draftConnector = next
    },
    setHoverCursorStyle: (next) => {
      sceneCursorStyle = next
    },
    getCurrentPath: () => currentPath,
    setCurrentPath: (next) => {
      currentPath = next
    },
    getIsCurrentlyDrawing: () => isCurrentlyDrawing,
    setIsCurrentlyDrawing: (next) => {
      isCurrentlyDrawing = next
    },
    getSelectionStart: () => selectionStart,
    setSelectionStart: (next) => {
      selectionStart = next
    },
    getSelectionEnd: () => selectionEnd,
    setSelectionEnd: (next) => {
      selectionEnd = next
    },
    getIsSelecting: () => isSelecting,
    setIsSelecting: (next) => {
      isSelecting = next
    },
    getSelectedElementIds: () => selectedElementIds,
    setSelectedElementIds: (next) => {
      selectedElementIds = next
    },
    getEditingText: () => editingText,
    setEditingText: (next) => {
      editingText = next
    },
    setElementOwner: (id, ownerId) => elementOwners.set(id, ownerId),
    formattingStore,
    addHistoryCommand: historyStore.addCommand,
    upsertElement,
    deleteElement,
    commitText: textEditorStore.commitText,
    startShapeTextEditing: textEditorStore.startShapeTextEditing,
    startConnectorTextEditing: textEditorStore.startConnectorTextEditing,
    startTextEditingAtPosition: textEditorStore.startTextEditingAtPosition
  })
  const keyboardStore = createWorkspaceKeyboardStore({
    getEditingText: () => editingText,
    getSelectedTool: () => selectedTool,
    getCanUndo: () => historyStore.canUndo,
    getCanRedo: () => historyStore.canRedo,
    handleUndo: historyStore.handleUndo,
    handleRedo: historyStore.handleRedo,
    deleteSelectedElements: sceneStore.deleteSelectedElements,
    clearSelection
  })

  function applyCommand(command: Command) {
    createApplyCommand({
      canvasId: activeCanvasId,
      paths,
      textElements,
      shapes,
      connectors,
      setPaths,
      setTextElements,
      setShapes,
      setConnectors,
      upsertElement,
      deleteElement
    })(command)
  }

  function syncElements(items: CanvasElement[]) {
    const drawingState = canvasElementsToDrawingState(items)
    elementOwners = drawingState.owners
    paths = drawingState.paths
    textElements = drawingState.textElements
    shapes = drawingState.shapes
    connectors = drawingState.connectors
  }

  async function loadCanvasElements(id: string) {
    try {
      const response = await listElements(id)
      syncElements(response.items)
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 403 &&
        error.code === 'canvas_access_denied'
      ) {
        void invalidateAll()
        return
      }
      canvasesStore.setError(
        error instanceof Error
          ? error.message
          : 'Failed to load canvas elements.'
      )
    }
  }

  function handleToolChange(tool: Tool) {
    if (selectedTool === 'text' && tool !== 'text' && editingText) {
      textEditorStore.commitText(editingText)
    }
    selectedTool = tool
    sceneCursorStyle = null
  }

  function handleModeChange(nextMode: WorkspaceMode) {
    if (isAnonymousPublicViewer && nextMode !== 'editor') {
      return
    }

    if (nextMode === modeStore.mode) {
      return
    }
    if (nextMode === 'workflows' && !workflowEnabled) {
      return
    }

    if (nextMode !== 'editor' && modeStore.mode === 'editor') {
      toolBeforeScenesMode = selectedTool
      if (editingText) {
        textEditorStore.commitText(editingText)
      }
    }

    if (nextMode !== 'workflows') {
      workflowsStore.clearFocusedWorkflow()
    }

    modeStore.setMode(nextMode)

    if (nextMode === 'editor' && canEdit()) {
      selectedTool = toolBeforeScenesMode
    }
  }

  // Canvas shortcuts (undo/redo/delete) must not fire while a scene dialog
  // is open — typing or pressing Delete there targets the scene, not the
  // drawing layer behind it.
  function handleWorkspaceKeydown(event: KeyboardEvent) {
    if (scenesStore.openScene || workflowsStore.focusedWorkflow) {
      return
    }
    keyboardStore.handleWorkspaceKeydown(event)
  }

  function mount() {
    if (isAnonymousPublicViewer) {
      canvasesStore.setError(null)
    } else {
      void canvasesStore.loadCanvasesList()
    }
    window.addEventListener('keydown', handleWorkspaceKeydown)

    return () => {
      window.removeEventListener('keydown', handleWorkspaceKeydown)
    }
  }

  $effect(() => {
    if (!canEdit() && selectedTool !== 'hand') {
      selectedTool = 'hand'
    }
  })

  // Scene/workflow modes keep the drawing layer passive: the hand tool turns
  // off the SVG's pointer events, so panning/zooming keep working untouched.
  $effect(() => {
    if (isAnonymousPublicViewer && modeStore.mode !== 'editor') {
      scenesStore.closeScene()
      workflowsStore.clearFocusedWorkflow()
      modeStore.setMode('editor')
      return
    }

    if (!workflowEnabled && modeStore.mode === 'workflows') {
      workflowsStore.clearFocusedWorkflow()
      modeStore.setMode('editor')
      return
    }

    if (modeStore.mode !== 'editor' && selectedTool !== 'hand') {
      selectedTool = 'hand'
    }
  })

  $effect(() => {
    const nextCanvasId = activeCanvasId
    if (!nextCanvasId || nextCanvasId === lastLoadedCanvasId) {
      return
    }

    lastLoadedCanvasId = nextCanvasId
    historyStore.clear()
    selectedElementIds = new Set()
    sceneCursorStyle = null
    selectionStart = null
    selectionEnd = null
    currentPath = []
    draftShape = null
    draftConnector = null
    editingText = null
    sceneLiveMessages = {}
    scenesStore.closeScene()
    workflowsStore.clearFocusedWorkflow()
    modeStore.loadModeState(nextCanvasId)
    if (isAnonymousPublicViewer) {
      modeStore.setMode('editor')
    }
    cameraStore.loadCameraState(nextCanvasId)
    if (isAnonymousPublicViewer) {
      canvasesStore.setError(null)
      scenesStore.setScenes([])
      workflowsStore.setWorkflows([])
      return
    }

    void loadCanvasElements(nextCanvasId)
    void scenesStore.loadScenes(nextCanvasId)
    if (workflowEnabled) {
      void workflowsStore.loadWorkflows(nextCanvasId)
    } else {
      workflowsStore.setWorkflows([])
    }
  })

  $effect(() => {
    const wasText = selectedTool === 'text'
    return () => {
      if (wasText || !editingText) {
        return
      }

      textEditorStore.commitText(editingText)
    }
  })

  return {
    setProps,
    setElements,
    mount,
    saveTitle: canvasesStore.saveTitle,
    saveVisibility: canvasesStore.saveVisibility,
    handleToolChange,
    handleModeChange,
    createScene: scenesStore.createSceneAtViewportCenter,
    createWorkflow: () =>
      workflowEnabled ? workflowsStore.createWorkflowAtViewportCenter() : null,
    patchScene: scenesStore.patchScene,
    patchWorkflow: workflowsStore.patchWorkflow,
    patchWorkflowDefinition: workflowsStore.patchWorkflowDefinition,
    patchWorkflowYaml: workflowsStore.patchWorkflowYaml,
    patchWorkflowNotes: workflowsStore.patchWorkflowNotes,
    patchWorkflowSettings: workflowsStore.patchWorkflowSettings,
    deleteScene: scenesStore.deleteScene,
    deleteWorkflow: workflowsStore.deleteWorkflow,
    canModifyScene: scenesStore.canModifyScene,
    canModifyWorkflow: workflowsStore.canModifyWorkflow,
    focusWorkflow: workflowsStore.focusWorkflow,
    openSceneById: scenesStore.openSceneById,
    closeOpenScene: scenesStore.closeScene,
    clearFocusedWorkflow: workflowsStore.clearFocusedWorkflow,
    broadcastSceneActivity: sceneActivityStore.broadcastActivity,
    handleListStyleToggle: textEditorStore.handleListStyleToggle,
    setTextFontSize: formattingStore.setTextFontSize,
    toggleTextBold: formattingStore.toggleTextBold,
    toggleTextItalic: formattingStore.toggleTextItalic,
    toggleTextUnderline: formattingStore.toggleTextUnderline,
    setTextColor: formattingStore.setTextColor,
    setDrawWidth: formattingStore.setDrawWidth,
    setDrawColor: formattingStore.setDrawColor,
    setDrawStyle: formattingStore.setDrawStyle,
    toggleHighlighter: formattingStore.toggleHighlighter,
    setHighlighterOpacity: formattingStore.setHighlighterOpacity,
    setShapeKind: sceneStore.setShapeKind,
    setConnectorKind: sceneStore.setConnectorKind,
    setDiagramFillColor: sceneStore.setDiagramFillColor,
    setDiagramStrokeColor: sceneStore.setDiagramStrokeColor,
    setDiagramStrokeWidth: sceneStore.setDiagramStrokeWidth,
    setDiagramStrokeStyle: sceneStore.setDiagramStrokeStyle,
    setDiagramOpacity: sceneStore.setDiagramOpacity,
    setDiagramStartArrow: sceneStore.setDiagramStartArrow,
    setDiagramEndArrow: sceneStore.setDiagramEndArrow,
    arrangeSelectedElements: sceneStore.arrangeSelectedElements,
    openShareDialog: accessStore.openShareDialog,
    handleRequestResolved: accessStore.handleRequestResolved,
    applyEditorValue: textEditorStore.applyEditorValue,
    handleTextInputBlur: textEditorStore.handleTextInputBlur,
    handleTextEditorKeydown: textEditorStore.handleTextEditorKeydown,
    syncEditorSelection: textEditorStore.syncEditorSelection,
    deleteSelectedElements: sceneStore.deleteSelectedElements,
    handleUndo: historyStore.handleUndo,
    handleRedo: historyStore.handleRedo,
    zoomIn: cameraStore.zoomIn,
    zoomOut: cameraStore.zoomOut,
    resetView: cameraStore.resetView,
    handleViewportPointerDown: cameraStore.handleViewportPointerDown,
    handleViewportPointerMove: cameraStore.handleViewportPointerMove,
    handleViewportPointerUp: cameraStore.handleViewportPointerUp,
    handleTouchStart: cameraStore.handleTouchStart,
    handleTouchMove: cameraStore.handleTouchMove,
    handleTouchEnd: cameraStore.handleTouchEnd,
    get rootStyle() {
      return cameraStore.rootStyle
    },
    get canvases() {
      return canvasesStore.canvases
    },
    get activeCanvasId() {
      return activeCanvasId
    },
    get currentCanvasTitle() {
      return canvasesStore.currentCanvasTitle
    },
    get currentCanvasVisibility() {
      // Public viewers are not in the canvases list (it only covers owned +
      // member canvases), but their presence here proves the canvas is public.
      return isPublicViewer ? 'public' : canvasesStore.currentCanvasVisibility
    },
    get isPublicViewer() {
      return isPublicViewer
    },
    get isAnonymousPublicViewer() {
      return isAnonymousPublicViewer
    },
    get canEdit() {
      return canEdit()
    },
    get canManageCanvas() {
      return canManageCanvas()
    },
    get workflowEnabled() {
      return workflowEnabled
    },
    get isLoadingCanvases() {
      return canvasesStore.isLoading
    },
    get selectedTool() {
      return selectedTool
    },
    get displayTool() {
      if (selectedTool !== 'select') return selectedTool
      if (sceneStore.hasShapeSelection) return 'shape'
      if (sceneStore.hasConnectorSelection) return 'connector'
      if (sceneStore.hasPathSelection) return 'pencil'
      return selectedTool
    },
    get role() {
      return role
    },
    get canvasIdForActions() {
      return activeCanvasId || canvasId
    },
    get displayMembers() {
      return presenceStore.displayMembers
    },
    get shareDialogOpen() {
      return accessStore.shareDialogOpen
    },
    set shareDialogOpen(open: boolean) {
      accessStore.shareDialogOpen = open
    },
    get pendingRequests() {
      return accessStore.pendingRequests
    },
    get textFormatting() {
      return formattingStore.textFormatting
    },
    get activeListStyle() {
      return textEditorStore.activeListStyle
    },
    get drawFormatting() {
      return formattingStore.drawFormatting
    },
    get diagramFormatting() {
      return formattingStore.diagramFormatting
    },
    get canvasesError() {
      return canvasesStore.error
    },
    get camera() {
      return cameraStore.camera
    },
    get editingText() {
      return editingText
    },
    get sceneElements() {
      return {
        paths,
        currentPath,
        textElements,
        shapes,
        connectors: isAnonymousPublicViewer
          ? connectors.filter(
              (connector) => !hasConnectorBindingToAnyScene(connector)
            )
          : connectors,
        scenes: isAnonymousPublicViewer ? [] : scenesStore.scenes,
        draftShape,
        draftConnector
      }
    },
    get sceneSelection() {
      return {
        selectedIds: selectedElementIds,
        start: selectionStart,
        end: selectionEnd
      }
    },
    get sceneHandlers() {
      return {
        pointerDown: sceneStore.handleSvgPointerDown,
        pointerMove: sceneStore.handleSvgPointerMove,
        pointerUp: sceneStore.handleSvgPointerUp,
        doubleClick: sceneStore.handleSvgDoubleClick
      }
    },
    get hasShapeSelection() {
      return sceneStore.hasShapeSelection
    },
    get hasConnectorSelection() {
      return sceneStore.hasConnectorSelection
    },
    get hasPathSelection() {
      return sceneStore.hasPathSelection
    },
    get mode() {
      return modeStore.mode
    },
    get scenes() {
      return isAnonymousPublicViewer ? [] : scenesStore.scenes
    },
    get workflows() {
      return isAnonymousPublicViewer ? [] : workflowsStore.workflows
    },
    get scenesError() {
      return isAnonymousPublicViewer ? null : scenesStore.error
    },
    get workflowsError() {
      return isAnonymousPublicViewer ? null : workflowsStore.error
    },
    get isCreatingScene() {
      return scenesStore.isCreatingScene
    },
    get isCreatingWorkflow() {
      return workflowsStore.isCreatingWorkflow
    },
    get openScene() {
      if (isAnonymousPublicViewer) {
        return null
      }

      const open = scenesStore.openScene
      if (!open) {
        return null
      }

      const scene = scenesStore.getScene(open.sceneId)
      if (!scene) {
        return null
      }

      return { scene, originRect: open.originRect }
    },
    get sceneCardHandlers() {
      return {
        pointerDown: scenesStore.handleCardPointerDown,
        pointerMove: scenesStore.handleCardPointerMove,
        pointerUp: scenesStore.handleCardPointerUp,
        pointerCancel: scenesStore.handleCardPointerCancel,
        open: scenesStore.handleCardOpen,
        resizePointerDown: scenesStore.handleResizePointerDown,
        resizePointerMove: scenesStore.handleResizePointerMove,
        resizePointerUp: scenesStore.handleResizePointerUp,
        resizePointerCancel: scenesStore.handleResizePointerCancel
      }
    },
    get workflowFrameHandlers() {
      return {
        pointerDown: workflowsStore.handleFramePointerDown,
        pointerMove: workflowsStore.handleFramePointerMove,
        pointerUp: workflowsStore.handleFramePointerUp,
        pointerCancel: workflowsStore.handleFramePointerCancel,
        resizePointerDown: workflowsStore.handleResizePointerDown,
        resizePointerMove: workflowsStore.handleResizePointerMove,
        resizePointerUp: workflowsStore.handleResizePointerUp,
        resizePointerCancel: workflowsStore.handleResizePointerCancel
      }
    },
    get focusedWorkflow() {
      return workflowsStore.focusedWorkflow
    },
    get sceneActivity() {
      return sceneActivityStore.activity
    },
    get sceneStreamingText() {
      return sceneActivityStore.streamingText
    },
    get sceneLiveMessages() {
      return sceneLiveMessages
    },
    get sceneDocumentRevisions() {
      return scenesStore.documentRevisions
    },
    get cursors() {
      return presenceStore.cursors
    },
    get selectedCount() {
      return selectedElementIds.size
    },
    get canUndo() {
      return historyStore.canUndo
    },
    get canRedo() {
      return historyStore.canRedo
    }
  }
}
