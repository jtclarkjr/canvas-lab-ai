import { cloneConnector, cloneShape } from '$lib/canvas/diagram-utils'
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
      },
      options?: { onError?: (error: unknown) => void }
    ) => void
  }
  deleteElement: {
    mutate: (
      variables: { id: string },
      options?: { onError?: (error: unknown) => void }
    ) => void
  }
}

export const createCreatePathCommand = (
  path: Path,
  userId: string
): CreatePathCommand => ({
  type: 'CREATE_PATH',
  timestamp: Date.now(),
  userId,
  element: { ...path, points: [...path.points] }
})

export const createCreateTextCommand = (
  text: TextElement,
  userId: string
): CreateTextCommand => ({
  type: 'CREATE_TEXT',
  timestamp: Date.now(),
  userId,
  element: { ...text }
})

export const createCreateShapeCommand = (
  shape: DiagramShape,
  userId: string
): CreateShapeCommand => ({
  type: 'CREATE_SHAPE',
  timestamp: Date.now(),
  userId,
  element: cloneShape(shape)
})

export const createCreateConnectorCommand = (
  connector: DiagramConnector,
  userId: string
): CreateConnectorCommand => ({
  type: 'CREATE_CONNECTOR',
  timestamp: Date.now(),
  userId,
  element: cloneConnector(connector)
})

export const createUpdateTextCommand = (
  elementId: string,
  before: TextElement,
  after: TextElement,
  userId: string
): UpdateTextCommand => ({
  type: 'UPDATE_TEXT',
  timestamp: Date.now(),
  userId,
  elementId,
  before: { ...before },
  after: { ...after }
})

export const createMoveElementCommand = (
  elementId: string,
  elementType: CanvasElementType,
  before: { x?: number; y?: number; points?: Point[] },
  after: { x?: number; y?: number; points?: Point[] },
  userId: string
): MoveElementCommand => ({
  type: 'MOVE_ELEMENT',
  timestamp: Date.now(),
  userId,
  elementId,
  elementType,
  before: before.points
    ? { ...before, points: [...before.points] }
    : { ...before },
  after: after.points ? { ...after, points: [...after.points] } : { ...after }
})

export const createMoveMultipleCommand = (
  elements: Array<{
    id: string
    type: CanvasElementType
    before: { x?: number; y?: number; points?: Point[] }
    after: { x?: number; y?: number; points?: Point[] }
  }>,
  userId: string
): MoveMultipleCommand => ({
  type: 'MOVE_MULTIPLE',
  timestamp: Date.now(),
  userId,
  elements: elements.map((element) => ({
    id: element.id,
    type: element.type,
    before: element.before.points
      ? { ...element.before, points: [...element.before.points] }
      : { ...element.before },
    after: element.after.points
      ? { ...element.after, points: [...element.after.points] }
      : { ...element.after }
  }))
})

export const createDeleteElementCommand = (
  element: CanvasDrawableElement,
  elementType: CanvasElementType,
  userId: string
): DeleteElementCommand => ({
  type: 'DELETE_ELEMENT',
  timestamp: Date.now(),
  userId,
  element: cloneCanvasElement(element, elementType),
  elementType
})

export const createDeleteMultipleCommand = (
  elements: Array<{
    element: CanvasDrawableElement
    type: CanvasElementType
  }>,
  userId: string
): DeleteMultipleCommand => ({
  type: 'DELETE_MULTIPLE',
  timestamp: Date.now(),
  userId,
  elements: elements.map((element) => ({
    element: cloneCanvasElement(element.element, element.type),
    type: element.type
  }))
})

export const createUpdateElementCommand = (
  elementId: string,
  elementType: CanvasElementType,
  before: CanvasDrawableElement,
  after: CanvasDrawableElement,
  userId: string
): UpdateElementCommand => ({
  type: 'UPDATE_ELEMENT',
  timestamp: Date.now(),
  userId,
  elementId,
  elementType,
  before: cloneCanvasElement(before, elementType),
  after: cloneCanvasElement(after, elementType)
})

export const createUpdateMultipleCommand = (
  elements: Array<{
    id: string
    type: CanvasElementType
    before: CanvasDrawableElement
    after: CanvasDrawableElement
  }>,
  userId: string
): UpdateMultipleCommand => ({
  type: 'UPDATE_MULTIPLE',
  timestamp: Date.now(),
  userId,
  elements: elements.map((element) => ({
    id: element.id,
    type: element.type,
    before: cloneCanvasElement(element.before, element.type),
    after: cloneCanvasElement(element.after, element.type)
  }))
})

export function cloneCanvasElement(
  element: CanvasDrawableElement,
  type: CanvasElementType
): CanvasDrawableElement {
  if (type === 'path' && 'points' in element) {
    return { ...element, points: [...element.points] }
  }
  if (type === 'shape' && isShape(element)) {
    return cloneShape(element)
  }
  if (type === 'connector' && 'start' in element) {
    return cloneConnector(element)
  }
  return { ...element }
}

const isPath = (element: CanvasDrawableElement): element is Path =>
  'points' in element
const isShape = (element: CanvasDrawableElement): element is DiagramShape =>
  'width' in element && !('points' in element)

export function getInverseCommand(command: Command): Command {
  switch (command.type) {
    case 'CREATE_PATH':
      return {
        type: 'DELETE_ELEMENT',
        timestamp: Date.now(),
        userId: command.userId,
        element: command.element,
        elementType: 'path'
      }
    case 'CREATE_TEXT':
      return {
        type: 'DELETE_ELEMENT',
        timestamp: Date.now(),
        userId: command.userId,
        element: command.element,
        elementType: 'text'
      }
    case 'CREATE_SHAPE':
      return {
        type: 'DELETE_ELEMENT',
        timestamp: Date.now(),
        userId: command.userId,
        element: command.element,
        elementType: 'shape'
      }
    case 'CREATE_CONNECTOR':
      return {
        type: 'DELETE_ELEMENT',
        timestamp: Date.now(),
        userId: command.userId,
        element: command.element,
        elementType: 'connector'
      }
    case 'CREATE_MULTIPLE':
      return {
        type: 'DELETE_MULTIPLE',
        timestamp: Date.now(),
        userId: command.userId,
        elements: command.elements
      }
    case 'UPDATE_TEXT':
      return {
        type: 'UPDATE_TEXT',
        timestamp: Date.now(),
        userId: command.userId,
        elementId: command.elementId,
        before: command.after,
        after: command.before
      }
    case 'UPDATE_ELEMENT':
      return {
        type: 'UPDATE_ELEMENT',
        timestamp: Date.now(),
        userId: command.userId,
        elementId: command.elementId,
        elementType: command.elementType,
        before: command.after,
        after: command.before
      }
    case 'UPDATE_MULTIPLE':
      return {
        type: 'UPDATE_MULTIPLE',
        timestamp: Date.now(),
        userId: command.userId,
        elements: command.elements.map((element) => ({
          id: element.id,
          type: element.type,
          before: element.after,
          after: element.before
        }))
      }
    case 'MOVE_ELEMENT':
      return {
        ...command,
        timestamp: Date.now(),
        before: command.after,
        after: command.before
      }
    case 'MOVE_MULTIPLE':
      return {
        type: 'MOVE_MULTIPLE',
        timestamp: Date.now(),
        userId: command.userId,
        elements: command.elements.map((element) => ({
          ...element,
          before: element.after,
          after: element.before
        }))
      }
    case 'DELETE_ELEMENT':
      if (command.elementType === 'path' && isPath(command.element)) {
        return {
          type: 'CREATE_PATH',
          timestamp: Date.now(),
          userId: command.userId,
          element: command.element
        }
      }
      if (command.elementType === 'shape' && isShape(command.element)) {
        return {
          type: 'CREATE_SHAPE',
          timestamp: Date.now(),
          userId: command.userId,
          element: command.element
        }
      }
      if (command.elementType === 'connector' && 'start' in command.element) {
        return {
          type: 'CREATE_CONNECTOR',
          timestamp: Date.now(),
          userId: command.userId,
          element: command.element
        }
      }
      return {
        type: 'CREATE_TEXT',
        timestamp: Date.now(),
        userId: command.userId,
        element: command.element as TextElement
      }
    case 'DELETE_MULTIPLE':
      return {
        type: 'CREATE_MULTIPLE',
        timestamp: Date.now(),
        userId: command.userId,
        elements: command.elements
      }
  }
}
