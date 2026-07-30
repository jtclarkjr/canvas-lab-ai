import {
  cloneCanvasElement,
  createCreatePathCommand,
  createDeleteMultipleCommand,
  createUpdateMultipleCommand
} from '$lib/canvas/commands'
import {
  cloneConnector,
  cloneEndpoint,
  cloneShape,
  hasConnectorBindingToShape,
  isAnchorTargetInSelection,
  isDiagramElementInSelection,
  resolveEndpoint
} from '$lib/canvas/diagram-utils'
import { isElementInSelection } from '$lib/canvas/drawing-utils'
import type {
  CanvasDrawableElement,
  CanvasElementType,
  DiagramEndpoint,
  Point,
  Scene
} from './types'
import type { SurfaceCtx } from './context/types'
import {
  findElementById,
  nowZ,
  persistElement,
  removeElementLocally
} from './element-utils'
import { canModifyHit, setCursorStyle } from './cursor'

export function deleteSelectedElements(ctx: SurfaceCtx) {
  const mutableSelectedIds = new Set(
    [...ctx.getSelectedElementIds()].filter((id) => ctx.canModifyElement(id))
  )
  const selectedShapeIds = new Set(
    ctx
      .getShapesSafe()
      .filter((shape) => mutableSelectedIds.has(shape.id))
      .map((shape) => shape.id)
  )

  for (const connector of ctx.getConnectorsSafe()) {
    for (const shapeId of selectedShapeIds) {
      if (
        hasConnectorBindingToShape(connector, shapeId) &&
        ctx.canModifyElement(connector.id)
      ) {
        mutableSelectedIds.add(connector.id)
      }
    }
  }

  ctx.setSelectedElementIds(mutableSelectedIds)
  if (mutableSelectedIds.size === 0) return

  const elementsToDelete: Array<{
    element: CanvasDrawableElement
    type: CanvasElementType
  }> = []

  mutableSelectedIds.forEach((id) => {
    const found = findElementById(ctx, id)
    if (found && found.type !== 'scene') {
      elementsToDelete.push({
        element: cloneCanvasElement(found.element, found.type),
        type: found.type
      })
    }
  })

  if (elementsToDelete.length > 0) {
    ctx.addHistoryCommand(
      createDeleteMultipleCommand(elementsToDelete, ctx.getUserId())
    )
  }

  mutableSelectedIds.forEach((id) => {
    removeElementLocally(ctx, id)
    ctx.deleteElement.mutate({ id })
  })

  ctx.setSelectedElementIds(new Set())
}

export function startMultiDrag(ctx: SurfaceCtx, point: Point) {
  ctx.isDraggingSelection = true
  setCursorStyle(ctx, 'move')
  ctx.dragStartPos = point
  const selectedElementIds = ctx.getSelectedElementIds()

  ctx.originalElementPositions = {
    paths: new Map(
      ctx
        .getPaths()
        .filter((path) => selectedElementIds.has(path.id))
        .map((path) => [path.id, { ...path, points: [...path.points] }])
    ),
    texts: new Map(
      ctx
        .getTextElements()
        .filter((text) => selectedElementIds.has(text.id))
        .map((text) => [text.id, { ...text }])
    ),
    shapes: new Map(
      ctx
        .getShapesSafe()
        .filter((shape) => selectedElementIds.has(shape.id))
        .map((shape) => [shape.id, cloneShape(shape)])
    ),
    connectors: new Map(
      ctx
        .getConnectorsSafe()
        .filter((connector) => selectedElementIds.has(connector.id))
        .map((connector) => [connector.id, cloneConnector(connector)])
    ),
    scenes: new Map(
      ctx
        .getScenesSafe()
        .filter((scene) => selectedElementIds.has(scene.id))
        .map((scene) => [scene.id, { ...scene }])
    )
  }
  ctx.setTransformBusyScenes?.([...ctx.originalElementPositions.scenes.keys()])
}

function movedEndpoint(
  ctx: SurfaceCtx,
  endpoint: DiagramEndpoint,
  dx: number,
  dy: number,
  selectedShapeIds: Set<string>,
  selectedSceneIds: Set<string>
): DiagramEndpoint {
  const binding = cloneEndpoint(endpoint).binding
  if (binding) {
    if (
      (binding.targetType === 'shape' &&
        selectedShapeIds.has(binding.targetId)) ||
      (binding.targetType === 'scene' && selectedSceneIds.has(binding.targetId))
    ) {
      return cloneEndpoint(endpoint)
    }
  }
  const point = resolveEndpoint(
    endpoint,
    [...ctx.originalElementPositions.shapes.values()],
    [...ctx.originalElementPositions.scenes.values()]
  )
  return { x: point.x + dx, y: point.y + dy, binding: null }
}

export function continueMultiDrag(
  ctx: SurfaceCtx,
  event: PointerEvent
): boolean {
  if (ctx.pendingDrag && ctx.getSelectedTool() === 'select') {
    const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
    const dx = Math.abs(point.x - ctx.pendingDrag.startPos.x)
    const dy = Math.abs(point.y - ctx.pendingDrag.startPos.y)
    const dragDistance = Math.hypot(dx, dy)

    if (dragDistance > 5) {
      startMultiDrag(ctx, ctx.pendingDrag.startPos)
      ctx.pendingDrag = null
    }
  }

  if (!ctx.isDraggingSelection || !ctx.dragStartPos) {
    return false
  }

  event.preventDefault()
  event.stopPropagation()

  const selectedElementIds = ctx.getSelectedElementIds()
  const selectedShapeIds = new Set(
    [...ctx.originalElementPositions.shapes.keys()].filter((id) =>
      selectedElementIds.has(id)
    )
  )
  const selectedSceneIds = new Set(
    [...ctx.originalElementPositions.scenes.keys()].filter((id) =>
      selectedElementIds.has(id)
    )
  )
  const currentPoint = ctx.screenToCanvasPoint(event.clientX, event.clientY)
  const dx = currentPoint.x - ctx.dragStartPos.x
  const dy = currentPoint.y - ctx.dragStartPos.y

  ctx.setPaths((previous) =>
    previous.map((path) => {
      const originalPath = ctx.originalElementPositions.paths.get(path.id)
      if (!originalPath) return path
      return {
        ...originalPath,
        points: originalPath.points.map((p) => ({
          x: p.x + dx,
          y: p.y + dy
        }))
      }
    })
  )

  ctx.setTextElements((previous) =>
    previous.map((text) => {
      const originalText = ctx.originalElementPositions.texts.get(text.id)
      if (!originalText) return text
      return {
        ...originalText,
        x: originalText.x + dx,
        y: originalText.y + dy
      }
    })
  )

  ctx.setShapesSafe((previous) =>
    previous.map((shape) => {
      const originalShape = ctx.originalElementPositions.shapes.get(shape.id)
      if (!originalShape) return shape
      return {
        ...originalShape,
        x: originalShape.x + dx,
        y: originalShape.y + dy
      }
    })
  )

  ctx.setScenesSafe((previous) =>
    previous.map((scene) => {
      const originalScene = ctx.originalElementPositions.scenes.get(scene.id)
      if (!originalScene) return scene
      return {
        ...originalScene,
        x: originalScene.x + dx,
        y: originalScene.y + dy
      }
    })
  )

  ctx.setConnectorsSafe((previous) =>
    previous.map((connector) => {
      const originalConnector = ctx.originalElementPositions.connectors.get(
        connector.id
      )
      if (!originalConnector) return connector
      return {
        ...originalConnector,
        start: movedEndpoint(
          ctx,
          originalConnector.start,
          dx,
          dy,
          selectedShapeIds,
          selectedSceneIds
        ),
        end: movedEndpoint(
          ctx,
          originalConnector.end,
          dx,
          dy,
          selectedShapeIds,
          selectedSceneIds
        )
      }
    })
  )

  return true
}

export function finishMultiDrag(ctx: SurfaceCtx): boolean {
  if (!ctx.isDraggingSelection) {
    return false
  }

  const updates: Array<{
    id: string
    type: CanvasElementType
    before: CanvasDrawableElement
    after: CanvasDrawableElement
  }> = []
  const sceneUpdates: Array<{ id: string; after: Scene }> = []

  for (const [id, before] of ctx.originalElementPositions.paths) {
    const after = ctx.getPaths().find((entry) => entry.id === id)
    if (after) updates.push({ id, type: 'path', before, after })
  }
  for (const [id, before] of ctx.originalElementPositions.texts) {
    const after = ctx.getTextElements().find((entry) => entry.id === id)
    if (after) updates.push({ id, type: 'text', before, after })
  }
  for (const [id, before] of ctx.originalElementPositions.shapes) {
    const after = ctx.getShapesSafe().find((entry) => entry.id === id)
    if (after) updates.push({ id, type: 'shape', before, after })
  }
  for (const [id, before] of ctx.originalElementPositions.connectors) {
    const after = ctx.getConnectorsSafe().find((entry) => entry.id === id)
    if (after) updates.push({ id, type: 'connector', before, after })
  }
  for (const [id] of ctx.originalElementPositions.scenes) {
    const after = ctx.getScenesSafe().find((entry) => entry.id === id)
    if (after) sceneUpdates.push({ id, after })
  }

  if (updates.length > 0) {
    ctx.addHistoryCommand(createUpdateMultipleCommand(updates, ctx.getUserId()))
    for (const update of updates) {
      persistElement(ctx, update.type, update.after)
    }
  }
  for (const update of sceneUpdates) {
    ctx.persistScenePatch?.(update.id, {
      x: update.after.x,
      y: update.after.y,
      width: update.after.width,
      height: update.after.height,
      rotation: update.after.rotation
    })
  }

  ctx.isDraggingSelection = false
  ctx.dragStartPos = null
  ctx.setTransformBusyScenes?.([])
  ctx.originalElementPositions = {
    paths: new Map(),
    texts: new Map(),
    shapes: new Map(),
    connectors: new Map(),
    scenes: new Map()
  }
  return true
}

export function finishSelection(ctx: SurfaceCtx): boolean {
  const selectionStart = ctx.getSelectionStart()
  const selectionEnd = ctx.getSelectionEnd()
  if (!ctx.getIsSelecting() || !selectionStart || !selectionEnd) {
    return false
  }

  const rect = {
    x1: Math.min(selectionStart.x, selectionEnd.x),
    y1: Math.min(selectionStart.y, selectionEnd.y),
    x2: Math.max(selectionStart.x, selectionEnd.x),
    y2: Math.max(selectionStart.y, selectionEnd.y)
  }

  const nextSelected = new Set<string>()

  for (const path of ctx.getPaths()) {
    if (isElementInSelection(path, rect)) {
      nextSelected.add(path.id)
    }
  }

  for (const text of ctx.getTextElements()) {
    if (isElementInSelection(text, rect)) {
      nextSelected.add(text.id)
    }
  }

  for (const shape of ctx.getShapesSafe()) {
    if (
      isDiagramElementInSelection(
        shape,
        ctx.getShapesSafe(),
        rect,
        ctx.getScenesSafe()
      )
    ) {
      nextSelected.add(shape.id)
    }
  }

  for (const connector of ctx.getConnectorsSafe()) {
    if (
      isDiagramElementInSelection(
        connector,
        ctx.getShapesSafe(),
        rect,
        ctx.getScenesSafe()
      )
    ) {
      nextSelected.add(connector.id)
    }
  }

  for (const scene of ctx.getScenesSafe()) {
    if (isAnchorTargetInSelection(scene, rect)) {
      nextSelected.add(scene.id)
    }
  }

  ctx.setSelectedElementIds(
    new Set(
      [...nextSelected].filter((id) => {
        const hit = findElementById(ctx, id)
        return hit ? canModifyHit(ctx, hit) : false
      })
    )
  )
  ctx.setIsSelecting(false)
  ctx.setSelectionStart(null)
  ctx.setSelectionEnd(null)
  return true
}

export function finishDrawing(ctx: SurfaceCtx): boolean {
  if (ctx.getSelectedTool() !== 'pencil' || !ctx.getIsCurrentlyDrawing()) {
    return false
  }

  ctx.setIsCurrentlyDrawing(false)
  const currentPath = ctx.getCurrentPath()

  if (currentPath.length > 0) {
    const pathId = crypto.randomUUID()
    ctx.setElementOwner(pathId, ctx.getUserId())
    const pathData = {
      points: currentPath,
      color: ctx.formattingStore.drawFormatting.color,
      width: ctx.formattingStore.drawFormatting.width,
      opacity: ctx.formattingStore.drawFormatting.isHighlighter
        ? ctx.formattingStore.drawFormatting.highlighterOpacity
        : 1
    }

    const newPath = {
      id: pathId,
      points: pathData.points,
      color: pathData.color,
      width: pathData.width,
      opacity: pathData.opacity,
      z: nowZ()
    }

    ctx.setPaths((previous) => [...previous, newPath])
    ctx.addHistoryCommand(createCreatePathCommand(newPath, ctx.getUserId()))
    ctx.setCurrentPath([])

    ctx.upsertElement.mutate(
      {
        id: pathId,
        canvasId: ctx.getActiveCanvasId(),
        type: 'path',
        data: pathData,
        x: 0,
        y: 0,
        z: newPath.z
      },
      {
        onError: () => {
          ctx.setPaths((previous) =>
            previous.filter((entry) => entry.id !== pathId)
          )
        }
      }
    )
  }

  return true
}
