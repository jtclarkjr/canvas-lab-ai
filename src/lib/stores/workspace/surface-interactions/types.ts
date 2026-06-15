import type { Command } from '$lib/canvas/commands'
import type { ResizeHandle } from '$lib/canvas/types'
import type {
  Arrowhead,
  CanvasDrawableElement,
  CanvasElementType,
  ConnectorKind,
  DiagramConnector,
  DiagramEndpoint,
  DiagramShape,
  EditingText,
  Path,
  Point,
  ShapeKind,
  StrokeStyle,
  TextElement,
  Tool
} from '$lib/canvas/types'
import type { Scene } from '$lib/scenes/schema'
import type { UpsertElementInput } from '$lib/workspace/schema'
import type { createWorkspaceFormattingStore } from '$lib/stores/workspace/formatting.svelte'

export type {
  Arrowhead,
  CanvasDrawableElement,
  CanvasElementType,
  ConnectorKind,
  DiagramConnector,
  DiagramEndpoint,
  DiagramShape,
  EditingText,
  Path,
  Point,
  ShapeKind,
  StrokeStyle,
  TextElement,
  Tool,
  Scene,
  Command
}

export type ElementSetter<T> = (next: T[] | ((previous: T[]) => T[])) => void

export const MIN_SCENE_WIDTH = 160
export const MIN_SCENE_HEIGHT = 120
export const MAX_SCENE_SIZE = 2000

export type UpsertElementMutation = {
  mutate(
    variables: UpsertElementInput,
    options?: { onError?: (error: unknown) => void }
  ): void
}

export type DeleteElementMutation = {
  mutate(
    variables: { id: string },
    options?: { onError?: (error: unknown) => void }
  ): void
}

export type WorkspaceSurfaceInteractionsInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
  getSelectedTool: () => Tool
  setSelectedTool: (tool: Tool) => void
  canEdit: () => boolean
  canModifyElement: (id: string) => boolean
  screenToCanvasPoint: (clientX: number, clientY: number) => Point
  getCameraScale: () => number
  getPaths: () => Path[]
  setPaths: ElementSetter<Path>
  getTextElements: () => TextElement[]
  setTextElements: ElementSetter<TextElement>
  getShapes?: () => DiagramShape[]
  setShapes?: ElementSetter<DiagramShape>
  getConnectors?: () => DiagramConnector[]
  setConnectors?: ElementSetter<DiagramConnector>
  getScenes?: () => Scene[]
  setScenes?: ElementSetter<Scene>
  canModifyScene?: (id: string) => boolean
  persistScenePatch?: (
    id: string,
    patch: Partial<Pick<Scene, 'x' | 'y' | 'width' | 'height' | 'rotation'>>
  ) => void
  setTransformBusyScenes?: (sceneIds: string[]) => void
  openSceneById?: (sceneId: string, originRect: DOMRect | null) => void
  setDraftShape?: (next: DiagramShape | null) => void
  setDraftConnector?: (next: DiagramConnector | null) => void
  setHoverCursorStyle?: (next: string | null) => void
  getCurrentPath: () => Point[]
  setCurrentPath: (next: Point[]) => void
  getIsCurrentlyDrawing: () => boolean
  setIsCurrentlyDrawing: (next: boolean) => void
  getSelectionStart: () => Point | null
  setSelectionStart: (next: Point | null) => void
  getSelectionEnd: () => Point | null
  setSelectionEnd: (next: Point | null) => void
  getIsSelecting: () => boolean
  setIsSelecting: (next: boolean) => void
  getSelectedElementIds: () => Set<string>
  setSelectedElementIds: (next: Set<string>) => void
  getEditingText: () => EditingText | null
  setEditingText: (next: EditingText | null) => void
  setElementOwner: (id: string, ownerId: string | null) => void
  formattingStore: ReturnType<typeof createWorkspaceFormattingStore>
  addHistoryCommand: (command: Command) => void
  upsertElement: UpsertElementMutation
  deleteElement: DeleteElementMutation
  commitText: (text: EditingText | null) => void
  startShapeTextEditing?: (shape: DiagramShape) => void
  startConnectorTextEditing?: (connector: DiagramConnector) => void
  startTextEditingAtPosition: (
    x: number,
    y: number,
    value: string,
    id?: string
  ) => void
}

export type HitElement =
  | { id: string; type: 'path'; element: Path; z: number }
  | { id: string; type: 'text'; element: TextElement; z: number }
  | { id: string; type: 'shape'; element: DiagramShape; z: number }
  | { id: string; type: 'connector'; element: DiagramConnector; z: number }
  | { id: string; type: 'scene'; element: Scene; z: number }

export type ActiveInteraction =
  | {
      type: 'shape-create'
      id: string
      start: Point
      z: number
    }
  | {
      type: 'connector-create'
      id: string
      start: DiagramEndpoint
      z: number
    }
  | {
      type: 'shape-resize'
      shapeId: string
      handle: ResizeHandle
      original: DiagramShape
    }
  | {
      type: 'shape-rotate'
      shapeId: string
      original: DiagramShape
    }
  | {
      type: 'scene-resize'
      sceneId: string
      handle: ResizeHandle
      original: Scene
    }
  | {
      type: 'scene-rotate'
      sceneId: string
      original: Scene
    }
  | {
      type: 'text-resize'
      textId: string
      handle: ResizeHandle
      original: TextElement
    }
  | {
      type: 'text-rotate'
      textId: string
      original: TextElement
    }
  | {
      type: 'path-resize'
      pathId: string
      handle: ResizeHandle
      original: Path
    }
  | {
      type: 'path-rotate'
      pathId: string
      original: Path
    }
  | {
      type: 'connector-end'
      connectorId: string
      end: 'start' | 'end'
      original: DiagramConnector
    }

export type ArrangementAction = 'front' | 'forward' | 'backward' | 'back'
