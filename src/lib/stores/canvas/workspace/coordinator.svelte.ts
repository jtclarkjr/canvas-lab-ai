import { invalidateAll } from '$app/navigation'
import {
  ApiClientError,
  deleteElement as deleteElementApi,
  listElements,
  upsertElement as upsertElementApi
} from '$lib/canvas/api'
import { createApplyCommand } from '$lib/canvas/apply-command'
import type { Command } from '$lib/canvas/commands'
import { canvasElementsToDrawingState } from '$lib/canvas/element-mapping'
import type { CanvasElement, UpsertElementInput } from '$lib/canvas/schema'
import type { CanvasRole } from '$lib/canvas/roles'
import type {
  CanvasWorkspaceStoreInput,
  EditingText,
  Path,
  Point,
  TextElement,
  Tool
} from '$lib/canvas/types'
import type { SceneMessage } from '$lib/scenes/schema'
import type { WorkspaceMode } from '$lib/scenes/types'
import { createWorkspaceModeStore } from '$lib/stores/canvas/scenes/mode.svelte'
import { createWorkspaceRealtimeScenesStore } from '$lib/stores/canvas/scenes/realtime-scenes.svelte'
import { createWorkspaceSceneActivityStore } from '$lib/stores/canvas/scenes/scene-activity.svelte'
import { createWorkspaceScenesStore } from '$lib/stores/canvas/scenes/scenes.svelte'
import { createWorkspaceAccessStore } from '$lib/stores/canvas/workspace/access.svelte'
import { createWorkspaceCameraStore } from '$lib/stores/canvas/workspace/camera.svelte'
import { createWorkspaceCanvasesStore } from '$lib/stores/canvas/workspace/canvases.svelte'
import { createWorkspaceFormattingStore } from '$lib/stores/canvas/workspace/formatting.svelte'
import { createWorkspaceHistoryStore } from '$lib/stores/canvas/workspace/history.svelte'
import { createWorkspaceKeyboardStore } from '$lib/stores/canvas/workspace/keyboard.svelte'
import { createWorkspacePresenceStore } from '$lib/stores/canvas/workspace/presence.svelte'
import { createWorkspaceRealtimeElementsStore } from '$lib/stores/canvas/workspace/realtime-elements.svelte'
import { createWorkspaceSceneInteractionsStore } from '$lib/stores/canvas/workspace/scene-interactions.svelte'
import { createWorkspaceTextEditorStore } from '$lib/stores/canvas/workspace/text-editor.svelte'

type WorkspaceElements = {
  rootEl: HTMLDivElement | null
  svgEl: SVGSVGElement | null
  textInputEl: HTMLTextAreaElement | null
}

export function createCanvasWorkspaceStore(input: CanvasWorkspaceStoreInput) {
  let canvasId = $state(input.canvasId)
  let userId = $state(input.userId)
  let userEmail = $state<string | null | undefined>(input.userEmail)
  let role = $state<CanvasRole>(input.role ?? 'owner')
  let isPublicViewer = $state(input.isPublicViewer ?? false)
  let canvasTitle = $state(input.canvasTitle ?? '')
  const sceneDocumentsStore = input.sceneDocumentsStore

  let rootEl = $state<HTMLDivElement | null>(null)
  let svgEl = $state<SVGSVGElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)

  let activeCanvasId = $state(input.canvasId)
  let selectedTool = $state<Tool>('select')
  let paths = $state<Path[]>([])
  let textElements = $state<TextElement[]>([])
  let currentPath = $state<Point[]>([])
  let isCurrentlyDrawing = $state(false)
  let selectionStart = $state<Point | null>(null)
  let selectionEnd = $state<Point | null>(null)
  let isSelecting = $state(false)
  let selectedElementIds = $state<Set<string>>(new Set())
  let editingText = $state<EditingText | null>(null)
  let editorSelection = $state({ start: 0, end: 0 })
  let elementOwners = new Map<string, string | null>()
  // Chat messages arriving over realtime, keyed by scene id, so viewers of
  // an open scene see other users' conversations appear live.
  let sceneLiveMessages = $state<Record<string, SceneMessage[]>>({})
  let toolBeforeScenesMode: Tool = 'select'

  let lastLoadedCanvasId = ''

  const cameraStore = createWorkspaceCameraStore({
    getActiveCanvasId: () => activeCanvasId,
    getRootElement: () => rootEl,
    getSelectedTool: () => selectedTool
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
    canManageCanvas
  })
  const presenceStore = createWorkspacePresenceStore({
    getActiveCanvasId: () => activeCanvasId,
    getCanvasId: () => canvasId,
    getUserId: () => userId,
    getUserEmail: () => userEmail
  })
  createWorkspaceRealtimeElementsStore({
    getActiveCanvasId: () => activeCanvasId,
    getEditingTextId: () => editingText?.id,
    hasElementOwner: (id) => elementOwners.has(id),
    setElementOwner: (id, ownerId) => elementOwners.set(id, ownerId),
    setPaths,
    setTextElements
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
    screenToCanvasPoint
  })
  const sceneActivityStore = createWorkspaceSceneActivityStore({
    getActiveCanvasId: () => activeCanvasId,
    getUserId: () => userId,
    getUserName: () => userEmail ?? 'A collaborator'
  })
  createWorkspaceRealtimeScenesStore({
    getActiveCanvasId: () => activeCanvasId,
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

  function setProps(next: CanvasWorkspaceStoreInput) {
    canvasId = next.canvasId
    userId = next.userId
    userEmail = next.userEmail
    role = next.role ?? 'owner'
    isPublicViewer = next.isPublicViewer ?? false
    canvasTitle = next.canvasTitle ?? ''
    activeCanvasId = next.canvasId
    canvasesStore.setCanvases(next.initialCanvases)
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

  function setTextElements(next: TextElement[] | ((previous: TextElement[]) => TextElement[])) {
    textElements = typeof next === 'function' ? next(textElements) : next
  }

  function screenToCanvasPoint(clientX: number, clientY: number): Point {
    return cameraStore.screenToCanvasPoint(svgEl, clientX, clientY)
  }

  const upsertElement = {
    mutate(variables: UpsertElementInput, options?: { onError?: (error: unknown) => void }) {
      void upsertElementApi(variables).catch((error) => {
        options?.onError?.(error)
      })
    }
  }

  const deleteElement = {
    mutate(variables: { id: string }, options?: { onError?: (error: unknown) => void }) {
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
  const sceneStore = createWorkspaceSceneInteractionsStore({
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
      setPaths,
      setTextElements,
      upsertElement,
      deleteElement
    })(command)
  }

  function syncElements(items: CanvasElement[]) {
    const drawingState = canvasElementsToDrawingState(items)
    elementOwners = drawingState.owners
    paths = drawingState.paths
    textElements = drawingState.textElements
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
        error instanceof Error ? error.message : 'Failed to load canvas elements.'
      )
    }
  }

  function handleToolChange(tool: Tool) {
    if (selectedTool === 'text' && tool !== 'text' && editingText) {
      textEditorStore.commitText(editingText)
    }
    selectedTool = tool
  }

  function handleModeChange(nextMode: WorkspaceMode) {
    if (nextMode === modeStore.mode) {
      return
    }

    if (nextMode === 'scenes') {
      toolBeforeScenesMode = selectedTool
      if (editingText) {
        textEditorStore.commitText(editingText)
      }
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
    if (scenesStore.openScene) {
      return
    }
    keyboardStore.handleWorkspaceKeydown(event)
  }

  function mount() {
    void canvasesStore.loadCanvasesList()
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

  // Scenes mode keeps the drawing layer passive: the hand tool turns off
  // the SVG's pointer events, so panning/zooming keep working untouched.
  $effect(() => {
    if (modeStore.mode === 'scenes' && selectedTool !== 'hand') {
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
    selectionStart = null
    selectionEnd = null
    currentPath = []
    editingText = null
    sceneLiveMessages = {}
    scenesStore.closeScene()
    modeStore.loadModeState(nextCanvasId)
    cameraStore.loadCameraState(nextCanvasId)
    void loadCanvasElements(nextCanvasId)
    void scenesStore.loadScenes(nextCanvasId)
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
    patchScene: scenesStore.patchScene,
    deleteScene: scenesStore.deleteScene,
    canModifyScene: scenesStore.canModifyScene,
    openSceneById: scenesStore.openSceneById,
    closeOpenScene: scenesStore.closeScene,
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
    get canEdit() {
      return canEdit()
    },
    get canManageCanvas() {
      return canManageCanvas()
    },
    get isLoadingCanvases() {
      return canvasesStore.isLoading
    },
    get selectedTool() {
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
      return { paths, currentPath, textElements }
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
    get mode() {
      return modeStore.mode
    },
    get scenes() {
      return scenesStore.scenes
    },
    get scenesError() {
      return scenesStore.error
    },
    get isCreatingScene() {
      return scenesStore.isCreatingScene
    },
    get openScene() {
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
