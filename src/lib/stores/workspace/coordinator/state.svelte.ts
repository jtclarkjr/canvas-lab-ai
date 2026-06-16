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
import type { SceneMessage } from '$lib/scenes/schema'
import { canvasElementsToDrawingState } from '$lib/workspace/element-mapping'
import type { CanvasWorkspaceStoreInput } from '$lib/workspace/types'

export type WorkspaceElements = {
  rootEl: HTMLDivElement | null
  svgEl: SVGSVGElement | null
  textInputEl: HTMLTextAreaElement | null
}

export type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

export class WorkspaceCoordinatorState {
  canvasId = $state('')
  userId = $state('')
  userEmail = $state<string | null | undefined>(null)
  role = $state<CanvasRole>('owner')
  isPublicViewer = $state(false)
  isAnonymousPublicViewer = $state(false)
  canvasTitle = $state('')
  workflowEnabled = $state(false)

  rootEl = $state<HTMLDivElement | null>(null)
  svgEl = $state<SVGSVGElement | null>(null)
  textInputEl = $state<HTMLTextAreaElement | null>(null)

  activeCanvasId = $state('')
  selectedTool = $state<Tool>('select')
  paths = $state<Path[]>([])
  textElements = $state<TextElement[]>([])
  shapes = $state<DiagramShape[]>([])
  connectors = $state<DiagramConnector[]>([])
  currentPath = $state<Point[]>([])
  draftShape = $state<DiagramShape | null>(null)
  draftConnector = $state<DiagramConnector | null>(null)
  isCurrentlyDrawing = $state(false)
  selectionStart = $state<Point | null>(null)
  selectionEnd = $state<Point | null>(null)
  isSelecting = $state(false)
  selectedElementIds = $state<Set<string>>(new Set())
  sceneCursorStyle = $state<string | null>(null)
  editingText = $state<EditingText | null>(null)
  editorSelection = $state({ start: 0, end: 0 })
  sceneLiveMessages = $state<Record<string, SceneMessage[]>>({})

  elementOwners = new Map<string, string | null>()
  toolBeforeScenesMode: Tool = 'select'
  lastLoadedCanvasId = ''

  readonly initiallyAnonymousPublicViewer: boolean
  readonly sceneDocumentsStore: CanvasWorkspaceStoreInput['sceneDocumentsStore']

  constructor(input: CanvasWorkspaceStoreInput) {
    const initialDrawingState = canvasElementsToDrawingState(
      input.initialElements ?? []
    )

    this.initiallyAnonymousPublicViewer = input.isAnonymousPublicViewer ?? false
    this.sceneDocumentsStore = input.sceneDocumentsStore
    this.canvasId = input.canvasId
    this.userId = input.userId
    this.userEmail = input.userEmail
    this.role = input.role ?? 'owner'
    this.isPublicViewer = input.isPublicViewer ?? false
    this.isAnonymousPublicViewer = this.initiallyAnonymousPublicViewer
    this.canvasTitle = input.canvasTitle ?? ''
    this.workflowEnabled =
      !this.initiallyAnonymousPublicViewer && (input.workflowEnabled ?? false)
    this.activeCanvasId = input.canvasId
    this.paths = initialDrawingState.paths
    this.textElements = initialDrawingState.textElements
    this.shapes = initialDrawingState.shapes
    this.connectors = initialDrawingState.connectors
    this.elementOwners = initialDrawingState.owners
  }

  setElements(next: WorkspaceElements) {
    this.rootEl = next.rootEl
    this.svgEl = next.svgEl
    this.textInputEl = next.textInputEl
  }

  canEdit() {
    return this.role !== 'reader'
  }

  canManageCanvas() {
    return this.role === 'owner' || this.role === 'admin'
  }

  canModifyElement(_id: string) {
    return (
      this.role === 'owner' || this.role === 'admin' || this.role === 'editor'
    )
  }

  clearSelection() {
    this.selectedElementIds = new Set()
    this.selectionStart = null
    this.selectionEnd = null
    this.isSelecting = false
  }

  setPaths(next: Path[] | ((previous: Path[]) => Path[])) {
    this.paths = typeof next === 'function' ? next(this.paths) : next
  }

  setTextElements(
    next: TextElement[] | ((previous: TextElement[]) => TextElement[])
  ) {
    this.textElements =
      typeof next === 'function' ? next(this.textElements) : next
  }

  setShapes(
    next: DiagramShape[] | ((previous: DiagramShape[]) => DiagramShape[])
  ) {
    this.shapes = typeof next === 'function' ? next(this.shapes) : next
  }

  setConnectors(
    next:
      | DiagramConnector[]
      | ((previous: DiagramConnector[]) => DiagramConnector[])
  ) {
    this.connectors = typeof next === 'function' ? next(this.connectors) : next
  }
}

export function createWorkspaceCoordinatorState(
  input: CanvasWorkspaceStoreInput
) {
  return new WorkspaceCoordinatorState(input)
}
