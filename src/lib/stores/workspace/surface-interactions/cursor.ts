import {
  findAnchorTargetHandleAtPoint,
  findConnectorEndpointAtPoint,
  findShapeHandleAtPoint,
  getShapeResizeCursor
} from '$lib/canvas/diagram-utils'
import {
  findPathHandleAtPoint,
  findTextHandleAtPoint,
  getTextResizeCursor
} from '$lib/canvas/drawing-utils'
import type { ActiveInteraction, HitElement, Point } from './types'
import type { SurfaceCtx } from './context/types'
import { findTopElementAtPoint } from './element-utils'

export function setCursorStyle(ctx: SurfaceCtx, next: string | null) {
  ctx.setHoverCursorStyle?.(next)
}

export function canModifySceneSafe(ctx: SurfaceCtx, id: string): boolean {
  return ctx.canModifyScene?.(id) ?? false
}

export function canModifyHit(ctx: SurfaceCtx, hit: HitElement): boolean {
  return hit.type === 'scene'
    ? canModifySceneSafe(ctx, hit.id)
    : ctx.canModifyElement(hit.id)
}

export function cursorForInteraction(
  interaction: ActiveInteraction | null
): string | null {
  if (!interaction) return null

  switch (interaction.type) {
    case 'shape-create':
    case 'connector-create':
      return 'crosshair'
    case 'shape-resize':
      return getShapeResizeCursor(
        interaction.handle,
        interaction.original.rotation
      )
    case 'scene-resize':
      return getShapeResizeCursor(
        interaction.handle,
        interaction.original.rotation
      )
    case 'text-resize':
      return getTextResizeCursor(
        interaction.handle,
        interaction.original.rotation ?? 0
      )
    case 'text-rotate':
      return 'grabbing'
    case 'path-resize':
      return getShapeResizeCursor(interaction.handle, 0)
    case 'path-rotate':
      return 'grabbing'
    case 'shape-rotate':
    case 'scene-rotate':
    case 'connector-end':
      return 'grabbing'
  }

  return null
}

export function cursorForPoint(ctx: SurfaceCtx, point: Point): string | null {
  if (!ctx.canEdit()) return null
  if (ctx.isDraggingSelection || ctx.pendingDrag) return 'move'

  switch (ctx.getSelectedTool()) {
    case 'select':
      return selectCursorForPoint(ctx, point)
    default:
      return null
  }
}

function selectCursorForPoint(ctx: SurfaceCtx, point: Point): string | null {
  const selectedIds = ctx.getSelectedElementIds()
  const threshold = 10 / ctx.getCameraScale()

  const sceneHandle = findAnchorTargetHandleAtPoint(
    point,
    ctx.getScenesSafe(),
    selectedIds,
    threshold
  )

  if (sceneHandle && canModifySceneSafe(ctx, sceneHandle.target.id)) {
    switch (sceneHandle.type) {
      case 'resize':
        return getShapeResizeCursor(
          sceneHandle.handle,
          sceneHandle.target.rotation
        )
      case 'rotate':
        return 'grab'
    }
  }

  const textHandle = findTextHandleAtPoint(
    point,
    ctx.getTextElements(),
    selectedIds,
    threshold
  )

  if (textHandle && ctx.canModifyElement(textHandle.text.id)) {
    switch (textHandle.type) {
      case 'resize':
        return getTextResizeCursor(
          textHandle.handle,
          textHandle.text.rotation ?? 0
        )
      case 'rotate':
        return 'grab'
    }
  }

  const shapeHandle = findShapeHandleAtPoint(
    point,
    ctx.getShapesSafe(),
    selectedIds,
    threshold
  )

  if (shapeHandle && ctx.canModifyElement(shapeHandle.shape.id)) {
    switch (shapeHandle.type) {
      case 'resize':
        return getShapeResizeCursor(
          shapeHandle.handle,
          shapeHandle.shape.rotation
        )
      case 'rotate':
        return 'grab'
    }
  }

  const pathHandle = findPathHandleAtPoint(
    point,
    ctx.getPaths(),
    selectedIds,
    threshold
  )
  if (pathHandle && ctx.canModifyElement(pathHandle.path.id)) {
    return pathHandle.type === 'resize'
      ? getShapeResizeCursor(pathHandle.handle, 0)
      : 'grab'
  }

  const endpointHit = findConnectorEndpointAtPoint(
    point,
    ctx.getConnectorsSafe(),
    ctx.getShapesSafe(),
    selectedIds,
    threshold,
    ctx.getScenesSafe()
  )

  if (endpointHit && ctx.canModifyElement(endpointHit.connector.id)) {
    return 'grab'
  }

  const hit = findTopElementAtPoint(ctx, point)
  if (!hit || !canModifyHit(ctx, hit)) return null

  switch (hit.type) {
    case 'shape':
    case 'connector':
    case 'path':
    case 'text':
      return 'move'
  }

  return null
}

export function updateHoverCursor(ctx: SurfaceCtx, event: PointerEvent) {
  if (event.type === 'pointerleave') {
    setCursorStyle(ctx, null)
    return
  }

  const activeCursor = cursorForInteraction(ctx.activeInteraction)
  if (activeCursor) {
    setCursorStyle(ctx, activeCursor)
    return
  }

  setCursorStyle(
    ctx,
    cursorForPoint(ctx, ctx.screenToCanvasPoint(event.clientX, event.clientY))
  )
}
