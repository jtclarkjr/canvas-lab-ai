import {
  createCreateConnectorCommand,
  createCreateShapeCommand,
  createUpdateMultipleCommand
} from '$lib/canvas/commands'
import {
  makeConnector,
  makeShapeFromBounds,
  resizeAnchorTargetFromHandle,
  resizeShapeFromHandle,
  resolveEndpoint,
  rotateAnchorTargetTowardPoint,
  rotateShapeTowardPoint
} from '$lib/canvas/diagram-utils'
import {
  resizePathFromHandle,
  resizeTextFromHandle,
  rotatePathTowardPoint,
  rotateTextTowardPoint
} from '$lib/canvas/drawing-utils'
import type { Point } from './types'
import { MAX_SCENE_SIZE, MIN_SCENE_HEIGHT, MIN_SCENE_WIDTH } from './types'
import type { SurfaceCtx } from './context/types'
import { nowZ, persistElement, snapEndpoint } from './element-utils'
import { cursorForInteraction, cursorForPoint, setCursorStyle } from './cursor'

export function finishActiveInteraction(
  ctx: SurfaceCtx,
  event: PointerEvent
): boolean {
  if (!ctx.activeInteraction) {
    return false
  }

  const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
  const interaction = ctx.activeInteraction
  ctx.activeInteraction = null

  if (interaction.type === 'shape-create') {
    const shape = makeShapeFromBounds(
      interaction.id,
      interaction.start,
      point,
      ctx.formattingStore.diagramFormatting,
      interaction.z
    )
    ctx.setDraftShape?.(null)
    ctx.setElementOwner(shape.id, ctx.getUserId())
    ctx.setShapesSafe((previous) => [...previous, shape])
    ctx.setSelectedElementIds(new Set([shape.id]))
    ctx.setSelectedTool('select')
    setCursorStyle(ctx, 'move')
    ctx.addHistoryCommand(createCreateShapeCommand(shape, ctx.getUserId()))
    persistElement(ctx, 'shape', shape)
    return true
  }

  if (interaction.type === 'connector-create') {
    const end = snapEndpoint(ctx, point)
    const startPoint = resolveEndpoint(
      interaction.start,
      ctx.getShapesSafe(),
      ctx.getScenesSafe()
    )
    const endPoint = resolveEndpoint(
      end,
      ctx.getShapesSafe(),
      ctx.getScenesSafe()
    )
    ctx.setDraftConnector?.(null)
    if (Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) < 4) {
      return true
    }
    const connector = makeConnector(
      interaction.id,
      interaction.start,
      end,
      ctx.formattingStore.diagramFormatting,
      interaction.z
    )
    ctx.setElementOwner(connector.id, ctx.getUserId())
    ctx.setConnectorsSafe((previous) => [...previous, connector])
    ctx.setSelectedElementIds(new Set([connector.id]))
    ctx.setSelectedTool('select')
    setCursorStyle(ctx, 'grab')
    ctx.addHistoryCommand(
      createCreateConnectorCommand(connector, ctx.getUserId())
    )
    persistElement(ctx, 'connector', connector)
    return true
  }

  if (interaction.type === 'scene-resize') {
    const after = ctx
      .getScenesSafe()
      .find((scene) => scene.id === interaction.sceneId)
    if (after) {
      ctx.persistScenePatch?.(after.id, {
        x: after.x,
        y: after.y,
        width: after.width,
        height: after.height,
        rotation: after.rotation
      })
    }
    ctx.setTransformBusyScenes?.([])
    setCursorStyle(ctx, cursorForPoint(ctx, point))
    return true
  }

  if (interaction.type === 'scene-rotate') {
    const after = ctx
      .getScenesSafe()
      .find((scene) => scene.id === interaction.sceneId)
    if (after) {
      ctx.persistScenePatch?.(after.id, {
        x: after.x,
        y: after.y,
        width: after.width,
        height: after.height,
        rotation: after.rotation
      })
    }
    ctx.setTransformBusyScenes?.([])
    setCursorStyle(ctx, cursorForPoint(ctx, point))
    return true
  }

  if (interaction.type === 'shape-resize') {
    const after = ctx
      .getShapesSafe()
      .find((shape) => shape.id === interaction.shapeId)
    if (after) {
      ctx.addHistoryCommand(
        createUpdateMultipleCommand(
          [
            { id: after.id, type: 'shape', before: interaction.original, after }
          ],
          ctx.getUserId()
        )
      )
      persistElement(ctx, 'shape', after)
    }
    setCursorStyle(ctx, cursorForPoint(ctx, point))
    return true
  }

  if (interaction.type === 'shape-rotate') {
    const after = ctx
      .getShapesSafe()
      .find((shape) => shape.id === interaction.shapeId)
    if (after) {
      ctx.addHistoryCommand(
        createUpdateMultipleCommand(
          [
            { id: after.id, type: 'shape', before: interaction.original, after }
          ],
          ctx.getUserId()
        )
      )
      persistElement(ctx, 'shape', after)
    }
    setCursorStyle(ctx, cursorForPoint(ctx, point))
    return true
  }

  if (
    interaction.type === 'text-resize' ||
    interaction.type === 'text-rotate'
  ) {
    const after = ctx
      .getTextElements()
      .find((text) => text.id === interaction.textId)
    if (after) {
      ctx.addHistoryCommand(
        createUpdateMultipleCommand(
          [{ id: after.id, type: 'text', before: interaction.original, after }],
          ctx.getUserId()
        )
      )
      persistElement(ctx, 'text', after)
    }
    setCursorStyle(ctx, cursorForPoint(ctx, point))
    return true
  }

  if (
    interaction.type === 'path-resize' ||
    interaction.type === 'path-rotate'
  ) {
    const after = ctx.getPaths().find((path) => path.id === interaction.pathId)
    if (after) {
      ctx.addHistoryCommand(
        createUpdateMultipleCommand(
          [{ id: after.id, type: 'path', before: interaction.original, after }],
          ctx.getUserId()
        )
      )
      persistElement(ctx, 'path', after)
    }
    setCursorStyle(ctx, cursorForPoint(ctx, point))
    return true
  }

  // connector-end
  const after = ctx
    .getConnectorsSafe()
    .find((connector) => connector.id === interaction.connectorId)
  if (after) {
    ctx.addHistoryCommand(
      createUpdateMultipleCommand(
        [
          {
            id: after.id,
            type: 'connector',
            before: interaction.original,
            after
          }
        ],
        ctx.getUserId()
      )
    )
    persistElement(ctx, 'connector', after)
  }
  setCursorStyle(ctx, cursorForPoint(ctx, point))
  return true
}

export function updateActiveInteraction(
  ctx: SurfaceCtx,
  event: PointerEvent
): boolean {
  if (!ctx.activeInteraction) {
    return false
  }

  event.preventDefault()
  event.stopPropagation()
  const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
  const interaction = ctx.activeInteraction

  if (interaction.type === 'shape-create') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setDraftShape?.(
      makeShapeFromBounds(
        interaction.id,
        interaction.start,
        point,
        ctx.formattingStore.diagramFormatting,
        interaction.z
      )
    )
    return true
  }

  if (interaction.type === 'connector-create') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    const end = snapEndpoint(ctx, point)
    ctx.setDraftConnector?.(
      makeConnector(
        interaction.id,
        interaction.start,
        end,
        ctx.formattingStore.diagramFormatting,
        interaction.z
      )
    )
    return true
  }

  if (interaction.type === 'shape-resize') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setShapesSafe((previous) =>
      previous.map((shape) =>
        shape.id === interaction.shapeId
          ? resizeShapeFromHandle(
              interaction.original,
              interaction.handle,
              point
            )
          : shape
      )
    )
    return true
  }

  if (interaction.type === 'scene-resize') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setScenesSafe((previous) =>
      previous.map((scene) =>
        scene.id === interaction.sceneId
          ? resizeAnchorTargetFromHandle(
              interaction.original,
              interaction.handle,
              point,
              {
                minWidth: MIN_SCENE_WIDTH,
                minHeight: MIN_SCENE_HEIGHT,
                maxWidth: MAX_SCENE_SIZE,
                maxHeight: MAX_SCENE_SIZE
              }
            )
          : scene
      )
    )
    return true
  }

  if (interaction.type === 'shape-rotate') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setShapesSafe((previous) =>
      previous.map((shape) =>
        shape.id === interaction.shapeId
          ? rotateShapeTowardPoint(interaction.original, point)
          : shape
      )
    )
    return true
  }

  if (interaction.type === 'scene-rotate') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setScenesSafe((previous) =>
      previous.map((scene) =>
        scene.id === interaction.sceneId
          ? rotateAnchorTargetTowardPoint(interaction.original, point)
          : scene
      )
    )
    return true
  }

  if (interaction.type === 'text-resize') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setTextElements((previous) =>
      previous.map((text) =>
        text.id === interaction.textId
          ? resizeTextFromHandle(
              interaction.original,
              interaction.handle,
              point
            )
          : text
      )
    )
    return true
  }

  if (interaction.type === 'text-rotate') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setTextElements((previous) =>
      previous.map((text) =>
        text.id === interaction.textId
          ? rotateTextTowardPoint(interaction.original, point)
          : text
      )
    )
    return true
  }

  if (interaction.type === 'path-resize') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setPaths((previous) =>
      previous.map((path) =>
        path.id === interaction.pathId
          ? resizePathFromHandle(
              interaction.original,
              interaction.handle,
              point
            )
          : path
      )
    )
    return true
  }

  if (interaction.type === 'path-rotate') {
    setCursorStyle(ctx, cursorForInteraction(interaction))
    ctx.setPaths((previous) =>
      previous.map((path) =>
        path.id === interaction.pathId
          ? rotatePathTowardPoint(interaction.original, point)
          : path
      )
    )
    return true
  }

  // connector-end
  const endpoint = snapEndpoint(ctx, point)
  setCursorStyle(ctx, cursorForInteraction(interaction))
  ctx.setConnectorsSafe((previous) =>
    previous.map((connector) => {
      if (connector.id !== interaction.connectorId) {
        return connector
      }
      if (interaction.end === 'start') {
        return { ...connector, start: endpoint }
      }
      return { ...connector, end: endpoint }
    })
  )
  return true
}

export function beginShapeCreation(
  ctx: SurfaceCtx,
  event: PointerEvent,
  point: Point
) {
  const id = crypto.randomUUID()
  const z = nowZ()
  ctx.activeInteraction = {
    type: 'shape-create',
    id,
    start: point,
    z
  }
  setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
  ctx.setSelectedElementIds(new Set())
  ctx.setDraftShape?.(
    makeShapeFromBounds(
      id,
      point,
      point,
      ctx.formattingStore.diagramFormatting,
      z
    )
  )
  ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
}

export function beginConnectorCreation(
  ctx: SurfaceCtx,
  event: PointerEvent,
  point: Point
) {
  const id = crypto.randomUUID()
  const z = nowZ()
  const start = snapEndpoint(ctx, point)
  ctx.activeInteraction = {
    type: 'connector-create',
    id,
    start,
    z
  }
  setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
  ctx.setSelectedElementIds(new Set())
  ctx.setDraftConnector?.(
    makeConnector(id, start, start, ctx.formattingStore.diagramFormatting, z)
  )
  ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
}
