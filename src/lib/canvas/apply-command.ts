import type {
  CanvasDrawableElement,
  CanvasElementType,
  DiagramConnector,
  DiagramShape,
  Path,
  TextElement
} from '$lib/canvas/types'
import type { ApplyCommandOptions, Command } from '$lib/canvas/commands'
import { textElementToData } from '$lib/canvas/drawing-utils'
import { connectorToData, shapeToData } from '$lib/canvas/diagram-utils'

const isPath = (element: CanvasDrawableElement): element is Path =>
  'points' in element
const isTextElement = (
  element: CanvasDrawableElement
): element is TextElement => 'text' in element
const isShape = (element: CanvasDrawableElement): element is DiagramShape =>
  'width' in element
const isConnector = (
  element: CanvasDrawableElement
): element is DiagramConnector => 'start' in element

function elementToData(
  type: CanvasElementType,
  element: CanvasDrawableElement
): Record<string, unknown> | null {
  if (type === 'path' && isPath(element)) {
    return {
      points: element.points,
      color: element.color,
      width: element.width,
      opacity: element.opacity
    }
  }
  if (type === 'text' && isTextElement(element)) {
    return textElementToData(element)
  }
  if (type === 'shape' && isShape(element)) {
    return shapeToData(element)
  }
  if (type === 'connector' && isConnector(element)) {
    return connectorToData(element)
  }
  return null
}

function elementPosition(
  type: CanvasElementType,
  element: CanvasDrawableElement
): { x: number; y: number } {
  if (
    (type === 'text' || type === 'shape') &&
    'x' in element &&
    'y' in element
  ) {
    return { x: element.x, y: element.y }
  }
  return { x: 0, y: 0 }
}

function elementZ(element: CanvasDrawableElement): number | null {
  return element.z ?? Date.now()
}

function upsertCanvasElement(
  options: ApplyCommandOptions,
  type: CanvasElementType,
  element: CanvasDrawableElement
) {
  const data = elementToData(type, element)
  const position = elementPosition(type, element)
  options.upsertElement.mutate({
    id: element.id,
    canvasId: options.canvasId,
    type,
    data,
    x: position.x,
    y: position.y,
    z: elementZ(element)
  })
}

function insertElement(
  options: ApplyCommandOptions,
  type: CanvasElementType,
  element: CanvasDrawableElement
) {
  switch (type) {
    case 'path':
      if (isPath(element)) options.setPaths((prev) => [...prev, element])
      break
    case 'text':
      if (isTextElement(element)) {
        options.setTextElements((prev) => [...prev, element])
      }
      break
    case 'shape':
      if (isShape(element)) options.setShapes?.((prev) => [...prev, element])
      break
    case 'connector':
      if (isConnector(element)) {
        options.setConnectors?.((prev) => [...prev, element])
      }
      break
  }
}

function replaceElement(
  options: ApplyCommandOptions,
  type: CanvasElementType,
  element: CanvasDrawableElement
) {
  switch (type) {
    case 'path':
      if (isPath(element)) {
        options.setPaths((prev) =>
          prev.map((entry) => (entry.id === element.id ? element : entry))
        )
      }
      break
    case 'text':
      if (isTextElement(element)) {
        options.setTextElements((prev) =>
          prev.map((entry) => (entry.id === element.id ? element : entry))
        )
      }
      break
    case 'shape':
      if (isShape(element)) {
        options.setShapes?.((prev) =>
          prev.map((entry) => (entry.id === element.id ? element : entry))
        )
      }
      break
    case 'connector':
      if (isConnector(element)) {
        options.setConnectors?.((prev) =>
          prev.map((entry) => (entry.id === element.id ? element : entry))
        )
      }
      break
  }
}

function removeElement(options: ApplyCommandOptions, id: string) {
  options.setPaths((prev) => prev.filter((entry) => entry.id !== id))
  options.setTextElements((prev) => prev.filter((entry) => entry.id !== id))
  options.setShapes?.((prev) => prev.filter((entry) => entry.id !== id))
  options.setConnectors?.((prev) => prev.filter((entry) => entry.id !== id))
}

export function createApplyCommand(options: ApplyCommandOptions) {
  return (command: Command) => {
    switch (command.type) {
      case 'CREATE_PATH':
        insertElement(options, 'path', command.element)
        upsertCanvasElement(options, 'path', command.element)
        break
      case 'CREATE_TEXT':
        insertElement(options, 'text', command.element)
        upsertCanvasElement(options, 'text', command.element)
        break
      case 'CREATE_SHAPE':
        insertElement(options, 'shape', command.element)
        upsertCanvasElement(options, 'shape', command.element)
        break
      case 'CREATE_CONNECTOR':
        insertElement(options, 'connector', command.element)
        upsertCanvasElement(options, 'connector', command.element)
        break
      case 'CREATE_MULTIPLE':
        for (const { element, type } of command.elements) {
          insertElement(options, type, element)
          upsertCanvasElement(options, type, element)
        }
        break
      case 'DELETE_ELEMENT':
        removeElement(options, command.element.id)
        options.deleteElement.mutate({ id: command.element.id })
        break
      case 'DELETE_MULTIPLE':
        for (const { element } of command.elements) {
          removeElement(options, element.id)
          options.deleteElement.mutate({ id: element.id })
        }
        break
      case 'UPDATE_TEXT':
        replaceElement(options, 'text', command.after)
        upsertCanvasElement(options, 'text', command.after)
        break
      case 'UPDATE_ELEMENT':
        replaceElement(options, command.elementType, command.after)
        upsertCanvasElement(options, command.elementType, command.after)
        break
      case 'UPDATE_MULTIPLE':
        for (const element of command.elements) {
          replaceElement(options, element.type, element.after)
          upsertCanvasElement(options, element.type, element.after)
        }
        break
      case 'MOVE_ELEMENT':
        switch (command.elementType) {
          case 'path':
            if (!command.after.points) break
            options.setPaths((prev) =>
              prev.map((entry) =>
                entry.id === command.elementId
                  ? { ...entry, points: command.after.points ?? entry.points }
                  : entry
              )
            )
            {
              const path = options.paths.find(
                (entry) => entry.id === command.elementId
              )
              if (path) {
                upsertCanvasElement(options, 'path', {
                  ...path,
                  points: command.after.points
                })
              }
            }
            break
          case 'text':
            if (
              command.after.x === undefined ||
              command.after.y === undefined
            ) {
              break
            }
            {
              const text = options.textElements.find(
                (entry) => entry.id === command.elementId
              )
              if (text) {
                const next = {
                  ...text,
                  x: command.after.x,
                  y: command.after.y
                }
                replaceElement(options, 'text', next)
                upsertCanvasElement(options, 'text', next)
              }
            }
            break
          case 'shape':
          case 'connector':
            break
        }
        break
      case 'MOVE_MULTIPLE':
        for (const element of command.elements) {
          switch (element.type) {
            case 'path':
              if (!element.after.points) break
              {
                const path = options.paths.find(
                  (entry) => entry.id === element.id
                )
                if (path) {
                  const next = { ...path, points: element.after.points }
                  replaceElement(options, 'path', next)
                  upsertCanvasElement(options, 'path', next)
                }
              }
              break
            case 'text':
              if (
                element.after.x === undefined ||
                element.after.y === undefined
              ) {
                break
              }
              {
                const text = options.textElements.find(
                  (entry) => entry.id === element.id
                )
                if (text) {
                  const next = {
                    ...text,
                    x: element.after.x,
                    y: element.after.y
                  }
                  replaceElement(options, 'text', next)
                  upsertCanvasElement(options, 'text', next)
                }
              }
              break
            case 'shape':
            case 'connector':
              break
          }
        }
        break
    }
  }
}
