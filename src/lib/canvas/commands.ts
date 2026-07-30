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
import type {
  CreatePathCommand,
  CreateTextCommand,
  CreateShapeCommand,
  CreateConnectorCommand,
  CreateMultipleCommand,
  UpdateTextCommand,
  MoveElementCommand,
  MoveMultipleCommand,
  UpdateElementCommand,
  UpdateMultipleCommand,
  DeleteElementCommand,
  DeleteMultipleCommand,
  Command
} from './commands/types'

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

export const createCreateMultipleCommand = (
  elements: Array<{
    element: CanvasDrawableElement
    type: CanvasElementType
  }>,
  userId: string
): CreateMultipleCommand => ({
  type: 'CREATE_MULTIPLE',
  timestamp: Date.now(),
  userId,
  elements: elements.map((element) => ({
    element: cloneCanvasElement(element.element, element.type),
    type: element.type
  }))
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
