import type {
  ActiveInteraction,
  DiagramConnector,
  DiagramShape,
  ElementSetter,
  Path,
  Point,
  Scene,
  TextElement,
  WorkspaceSurfaceInteractionsInput
} from '../types'

export type SurfaceCtx = WorkspaceSurfaceInteractionsInput & {
  getShapesSafe: () => DiagramShape[]
  getConnectorsSafe: () => DiagramConnector[]
  getScenesSafe: () => Scene[]
  setShapesSafe: ElementSetter<DiagramShape>
  setConnectorsSafe: ElementSetter<DiagramConnector>
  setScenesSafe: ElementSetter<Scene>
  activeInteraction: ActiveInteraction | null
  pendingDrag: { elementId: string; startPos: Point } | null
  originalElementPositions: {
    paths: Map<string, Path>
    texts: Map<string, TextElement>
    shapes: Map<string, DiagramShape>
    connectors: Map<string, DiagramConnector>
    scenes: Map<string, Scene>
  }
  lastClickTime: number
  lastClickPos: Point | null
  isDraggingSelection: boolean
  dragStartPos: Point | null
}
