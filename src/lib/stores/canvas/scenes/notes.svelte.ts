import { createApplyCommand } from '$lib/canvas/apply-command'
import type { Command } from '$lib/canvas/commands'
import { screenToCanvas } from '$lib/canvas/drawing-utils'
import type {
  Camera,
  EditingText,
  Path,
  Point,
  TextElement,
  Tool
} from '$lib/canvas/types'
import { getSceneDocument, updateSceneDocument } from '$lib/scenes/api'
import { markdownDocumentContentSchema } from '$lib/scenes/schema'
import { createWorkspaceFormattingStore } from '$lib/stores/canvas/workspace/formatting.svelte'
import { createWorkspaceHistoryStore } from '$lib/stores/canvas/workspace/history.svelte'
import { createWorkspaceSceneInteractionsStore } from '$lib/stores/canvas/workspace/scene-interactions.svelte'
import { createWorkspaceTextEditorStore } from '$lib/stores/canvas/workspace/text-editor.svelte'

const SAVE_DEBOUNCE_MS = 800

// Fixed identity camera: the annotation overlay maps 1:1 onto the
// rendered document.
const notesCamera: Camera = { x: 0, y: 0, scale: 1 }

type NotesSceneInput = {
  canvasId: string
  sceneId: string
  documentId: string
  getUserId: () => string
  canModify: () => boolean
  onActivity: (kind: 'drawing' | 'idle') => void
}

// Annotation workspace drawn over a document: reuses the canvas
// interaction/text-editor/formatting/history stores (all dependency-
// injected) with mutations that debounce-save the annotation layer into
// the document's content (content.annotations), preserving its markdown.
export function createNotesSceneStore({
  canvasId,
  sceneId,
  documentId,
  getUserId,
  canModify,
  onActivity
}: NotesSceneInput) {
  let svgEl = $state<SVGSVGElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)

  let selectedTool = $state<Tool>('pencil')
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
  let isDirty = $state(false)
  let isSaving = $state(false)
  let error = $state<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  // Coalescing: one persist in flight at a time; edits made while saving
  // roll into a follow-up persist instead of overlapping requests.
  let persistQueued = false
  let dirtyCounter = 0

  function setPaths(next: Path[] | ((previous: Path[]) => Path[])) {
    paths = typeof next === 'function' ? next(paths) : next
  }

  function setTextElements(
    next: TextElement[] | ((previous: TextElement[]) => TextElement[])
  ) {
    textElements = typeof next === 'function' ? next(textElements) : next
  }

  function screenToCanvasPoint(clientX: number, clientY: number): Point {
    if (!svgEl) {
      return { x: 0, y: 0 }
    }
    return screenToCanvas(
      clientX,
      clientY,
      svgEl.getBoundingClientRect(),
      notesCamera
    )
  }

  function snapshotAnnotations() {
    return {
      paths: $state.snapshot(paths),
      textElements: $state.snapshot(textElements)
    }
  }

  async function persist() {
    if (!canModify()) {
      return
    }

    if (isSaving) {
      persistQueued = true
      return
    }

    const dirtyToken = dirtyCounter
    isSaving = true
    try {
      // Re-fetch the document right before writing: the AI (or a manual
      // save) may have changed the markdown while annotating — only the
      // annotation layer belongs to this store.
      const current = await getSceneDocument(canvasId, sceneId, documentId)
      const parsed = markdownDocumentContentSchema.safeParse(
        current.item.content
      )

      await updateSceneDocument(canvasId, sceneId, documentId, {
        content: {
          ...(parsed.success
            ? { docType: parsed.data.docType, markdown: parsed.data.markdown }
            : null),
          annotations: snapshotAnnotations()
        }
      })
      // Only mark clean if nothing changed while the request was in flight.
      if (dirtyToken === dirtyCounter) {
        isDirty = false
      }
      error = null
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to save notes.'
    } finally {
      isSaving = false
      if (persistQueued) {
        persistQueued = false
        void persist()
      } else {
        onActivity('idle')
      }
    }
  }

  function scheduleSave() {
    if (!canModify()) {
      return
    }

    isDirty = true
    dirtyCounter += 1
    onActivity('drawing')
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveTimer = null
      void persist()
    }, SAVE_DEBOUNCE_MS)
  }

  function flush() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (isDirty) {
      void persist()
    }
  }

  // Seed or remotely refresh the annotation layer from document content.
  // Never clobbers local unsaved work or an in-flight stroke.
  function applyAnnotations(content: unknown) {
    if (isDirty || isCurrentlyDrawing || editingText) {
      return
    }

    const parsed = markdownDocumentContentSchema.safeParse(content)
    const annotations = parsed.success ? parsed.data.annotations : undefined
    paths = (annotations?.paths ?? []) as unknown as Path[]
    textElements = (annotations?.textElements ?? []) as unknown as TextElement[]
  }

  // The injected mutations are the persistence hooks of the reused stores;
  // the stores already updated local state, so the payload is ignored and
  // the whole annotation layer is debounce-saved at once.
  const upsertElement = {
    mutate() {
      scheduleSave()
    }
  }
  const deleteElement = {
    mutate() {
      scheduleSave()
    }
  }

  const formattingStore = createWorkspaceFormattingStore()
  const historyStore = createWorkspaceHistoryStore({
    getUserId,
    applyCommand
  })
  const textEditorStore = createWorkspaceTextEditorStore({
    getActiveCanvasId: () => canvasId,
    getUserId,
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
    setElementOwner: () => undefined,
    formattingStore,
    addHistoryCommand: historyStore.addCommand,
    upsertElement,
    deleteElement
  })
  const interactionsStore = createWorkspaceSceneInteractionsStore({
    getActiveCanvasId: () => canvasId,
    getUserId,
    getSelectedTool: () => selectedTool,
    setSelectedTool: (tool) => {
      selectedTool = tool
    },
    canEdit: canModify,
    canModifyElement: () => canModify(),
    screenToCanvasPoint,
    getCameraScale: () => notesCamera.scale,
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
    setElementOwner: () => undefined,
    formattingStore,
    addHistoryCommand: historyStore.addCommand,
    upsertElement,
    deleteElement,
    commitText: (text) => textEditorStore.commitText(text),
    startTextEditingAtPosition: (x, y, value, id) =>
      textEditorStore.startTextEditingAtPosition(x, y, value, id)
  })

  function applyCommand(command: Command) {
    createApplyCommand({
      canvasId,
      paths,
      textElements,
      setPaths,
      setTextElements,
      upsertElement,
      deleteElement
    })(command)
  }

  function handleToolChange(tool: Tool) {
    if (selectedTool === 'text' && tool !== 'text' && editingText) {
      textEditorStore.commitText(editingText)
    }
    selectedTool = tool
  }

  function setElements(next: {
    svgEl: SVGSVGElement | null
    textInputEl: HTMLTextAreaElement | null
  }) {
    svgEl = next.svgEl
    textInputEl = next.textInputEl
  }

  return {
    applyAnnotations,
    flush,
    setElements,
    handleToolChange,
    handleUndo: historyStore.handleUndo,
    handleRedo: historyStore.handleRedo,
    deleteSelectedElements: interactionsStore.deleteSelectedElements,
    applyEditorValue: textEditorStore.applyEditorValue,
    handleTextInputBlur: textEditorStore.handleTextInputBlur,
    handleTextEditorKeydown: textEditorStore.handleTextEditorKeydown,
    syncEditorSelection: textEditorStore.syncEditorSelection,
    setDrawColor: formattingStore.setDrawColor,
    setDrawWidth: formattingStore.setDrawWidth,
    toggleHighlighter: formattingStore.toggleHighlighter,
    get camera() {
      return notesCamera
    },
    get selectedTool() {
      return selectedTool
    },
    get drawFormatting() {
      return formattingStore.drawFormatting
    },
    get textFormatting() {
      return formattingStore.textFormatting
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
        pointerDown: interactionsStore.handleSvgPointerDown,
        pointerMove: interactionsStore.handleSvgPointerMove,
        pointerUp: interactionsStore.handleSvgPointerUp,
        doubleClick: interactionsStore.handleSvgDoubleClick
      }
    },
    get canUndo() {
      return historyStore.canUndo
    },
    get canRedo() {
      return historyStore.canRedo
    },
    get selectedCount() {
      return selectedElementIds.size
    },
    get isSaving() {
      return isSaving
    },
    get isDirty() {
      return isDirty
    },
    get error() {
      return error
    }
  }
}
