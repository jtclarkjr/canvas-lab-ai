import {
  textElementToData,
  findTextAtPoint,
  isPointNearPath
} from '$lib/canvas/drawing-utils'
import {
  cloneEndpoint,
  connectorToData,
  findConnectorAtPoint,
  findNearestShapeAnchor,
  findShapeAtPoint,
  isPointInAnchorTarget,
  shapeToData
} from '$lib/canvas/diagram-utils'
import type {
  CanvasDrawableElement,
  CanvasElementType,
  DiagramConnector,
  DiagramEndpoint,
  DiagramShape,
  Point,
  TextElement
} from './types'
import type { HitElement } from './types'
import type { SurfaceCtx } from './context'

export function nowZ() {
  return Date.now()
}

export function checkDoubleClick(ctx: SurfaceCtx, point: Point): boolean {
  const timeSinceLastClick = Date.now() - ctx.lastClickTime
  const isSamePosition =
    ctx.lastClickPos !== null &&
    Math.abs(point.x - ctx.lastClickPos.x) < 5 &&
    Math.abs(point.y - ctx.lastClickPos.y) < 5
  return timeSinceLastClick < 300 && isSamePosition
}

export function updateClickTracking(ctx: SurfaceCtx, point: Point) {
  ctx.lastClickTime = Date.now()
  ctx.lastClickPos = point
}

export function elementPosition(
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

export function isShapeElement(
  element: CanvasDrawableElement
): element is DiagramShape {
  return 'width' in element && !('points' in element)
}

export function isTextElement(
  element: CanvasDrawableElement
): element is TextElement {
  return 'fontSize' in element && !('kind' in element)
}

export function isConnectorElement(
  element: CanvasDrawableElement
): element is DiagramConnector {
  return 'start' in element && 'end' in element
}

export function elementData(
  type: CanvasElementType,
  element: CanvasDrawableElement
): Record<string, unknown> | null {
  if (type === 'path' && 'points' in element) {
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
  if (type === 'shape' && isShapeElement(element)) {
    return shapeToData(element)
  }
  if (type === 'connector' && 'start' in element) {
    return connectorToData(element)
  }
  return null
}

export function persistElement(
  ctx: SurfaceCtx,
  type: CanvasElementType,
  element: CanvasDrawableElement
) {
  const position = elementPosition(type, element)
  ctx.upsertElement.mutate({
    id: element.id,
    canvasId: ctx.getActiveCanvasId(),
    type,
    data: elementData(type, element),
    x: position.x,
    y: position.y,
    z: element.z ?? nowZ()
  })
}

export function removeElementLocally(ctx: SurfaceCtx, id: string) {
  ctx.setPaths((previous) => previous.filter((entry) => entry.id !== id))
  ctx.setTextElements((previous) => previous.filter((entry) => entry.id !== id))
  ctx.setShapesSafe((previous) => previous.filter((entry) => entry.id !== id))
  ctx.setConnectorsSafe((previous) =>
    previous.filter((entry) => entry.id !== id)
  )
}

export function allElements(ctx: SurfaceCtx): HitElement[] {
  const scenes = ctx.getScenesSafe()
  const items: HitElement[] = [
    ...ctx.getPaths().map((element) => ({
      id: element.id,
      type: 'path' as const,
      element,
      z: element.z ?? 0
    })),
    ...ctx.getTextElements().map((element) => ({
      id: element.id,
      type: 'text' as const,
      element,
      z: element.z ?? 0
    })),
    ...ctx.getShapesSafe().map((element) => ({
      id: element.id,
      type: 'shape' as const,
      element,
      z: element.z ?? 0
    })),
    ...ctx.getConnectorsSafe().map((element) => ({
      id: element.id,
      type: 'connector' as const,
      element,
      z: element.z ?? 0
    })),
    ...scenes.map((element, index) => ({
      id: element.id,
      type: 'scene' as const,
      element,
      z: Number.MAX_SAFE_INTEGER - scenes.length + index
    }))
  ]
  return items.sort((first, second) => first.z - second.z)
}

export function findElementById(
  ctx: SurfaceCtx,
  id: string
): HitElement | null {
  return allElements(ctx).find((entry) => entry.id === id) ?? null
}

export function findTopElementAtPoint(
  ctx: SurfaceCtx,
  point: Point
): HitElement | null {
  const threshold = 10 / ctx.getCameraScale()
  const ordered = [...allElements(ctx)].reverse()
  for (const item of ordered) {
    switch (item.type) {
      case 'text':
        if (findTextAtPoint(point, [item.element])) return item
        break
      case 'shape':
        if (findShapeAtPoint(point, [item.element])) return item
        break
      case 'connector':
        if (
          findConnectorAtPoint(
            point,
            [item.element],
            ctx.getShapesSafe(),
            threshold,
            ctx.getScenesSafe()
          )
        ) {
          return item
        }
        break
      case 'scene':
        if (isPointInAnchorTarget(point, item.element)) return item
        break
      case 'path':
        if (isPointNearPath(point, item.element, threshold)) return item
        break
    }
  }
  return null
}

export function snapEndpoint(ctx: SurfaceCtx, point: Point): DiagramEndpoint {
  const anchor = findNearestShapeAnchor(
    point,
    ctx.getShapesSafe(),
    14 / ctx.getCameraScale(),
    ctx.getScenesSafe()
  )
  if (anchor) {
    return cloneEndpoint(anchor.endpoint)
  }
  return { x: point.x, y: point.y, binding: null }
}
