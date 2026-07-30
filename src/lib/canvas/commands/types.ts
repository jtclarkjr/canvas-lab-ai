import type {
  CanvasDrawableElement,
  CanvasElementType,
  DiagramConnector,
  DiagramShape,
  Path,
  Point,
  TextElement
} from '$lib/canvas/types'

export type CommandType =
  | 'CREATE_PATH'
  | 'CREATE_TEXT'
  | 'CREATE_SHAPE'
  | 'CREATE_CONNECTOR'
  | 'CREATE_MULTIPLE'
  | 'UPDATE_TEXT'
  | 'UPDATE_ELEMENT'
  | 'UPDATE_MULTIPLE'
  | 'MOVE_ELEMENT'
  | 'MOVE_MULTIPLE'
  | 'DELETE_ELEMENT'
  | 'DELETE_MULTIPLE'

export interface BaseCommand {
  type: CommandType
  timestamp: number
  userId: string
}

export type CommandAudit = {
  action: 'undo' | 'redo'
  commandType: CommandType
}

export interface CreatePathCommand extends BaseCommand {
  type: 'CREATE_PATH'
  element: Path
}

export interface CreateTextCommand extends BaseCommand {
  type: 'CREATE_TEXT'
  element: TextElement
}

export interface CreateShapeCommand extends BaseCommand {
  type: 'CREATE_SHAPE'
  element: DiagramShape
}

export interface CreateConnectorCommand extends BaseCommand {
  type: 'CREATE_CONNECTOR'
  element: DiagramConnector
}

export interface CreateMultipleCommand extends BaseCommand {
  type: 'CREATE_MULTIPLE'
  elements: Array<{
    element: CanvasDrawableElement
    type: CanvasElementType
  }>
}

export interface UpdateTextCommand extends BaseCommand {
  type: 'UPDATE_TEXT'
  elementId: string
  before: TextElement
  after: TextElement
}

export interface MoveElementCommand extends BaseCommand {
  type: 'MOVE_ELEMENT'
  elementId: string
  elementType: CanvasElementType
  before: { x?: number; y?: number; points?: Point[] }
  after: { x?: number; y?: number; points?: Point[] }
}

export interface MoveMultipleCommand extends BaseCommand {
  type: 'MOVE_MULTIPLE'
  elements: Array<{
    id: string
    type: CanvasElementType
    before: { x?: number; y?: number; points?: Point[] }
    after: { x?: number; y?: number; points?: Point[] }
  }>
}

export interface UpdateElementCommand extends BaseCommand {
  type: 'UPDATE_ELEMENT'
  elementId: string
  elementType: CanvasElementType
  before: CanvasDrawableElement
  after: CanvasDrawableElement
}

export interface UpdateMultipleCommand extends BaseCommand {
  type: 'UPDATE_MULTIPLE'
  elements: Array<{
    id: string
    type: CanvasElementType
    before: CanvasDrawableElement
    after: CanvasDrawableElement
  }>
}

export interface DeleteElementCommand extends BaseCommand {
  type: 'DELETE_ELEMENT'
  element: CanvasDrawableElement
  elementType: CanvasElementType
}

export interface DeleteMultipleCommand extends BaseCommand {
  type: 'DELETE_MULTIPLE'
  elements: Array<{
    element: CanvasDrawableElement
    type: CanvasElementType
  }>
}

export type Command =
  | CreatePathCommand
  | CreateTextCommand
  | CreateShapeCommand
  | CreateConnectorCommand
  | CreateMultipleCommand
  | UpdateTextCommand
  | UpdateElementCommand
  | UpdateMultipleCommand
  | MoveElementCommand
  | MoveMultipleCommand
  | DeleteElementCommand
  | DeleteMultipleCommand

export type SetState<T> = (value: T | ((prev: T) => T)) => void

export interface ApplyCommandOptions {
  canvasId: string
  paths: Path[]
  textElements: TextElement[]
  shapes?: DiagramShape[]
  connectors?: DiagramConnector[]
  setPaths: SetState<Path[]>
  setTextElements: SetState<TextElement[]>
  setShapes?: SetState<DiagramShape[]>
  setConnectors?: SetState<DiagramConnector[]>
  upsertElement: {
    mutate: (
      variables: {
        id?: string
        canvasId: string
        type: string
        data?: Record<string, unknown> | null
        x: number
        y: number
        z?: number | null
        audit?: CommandAudit
      },
      options?: { onError?: (error: unknown) => void }
    ) => void
  }
  deleteElement: {
    mutate: (
      variables: { id: string; audit?: CommandAudit },
      options?: { onError?: (error: unknown) => void }
    ) => void
  }
}
