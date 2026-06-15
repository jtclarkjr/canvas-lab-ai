import { createDeleteElementCommand } from '$lib/canvas/commands'
import {
  cloneConnector,
  cloneShape,
  findAnchorTargetHandleAtPoint,
  findConnectorEndpointAtPoint,
  findShapeAtPoint,
  findShapeHandleAtPoint
} from '$lib/canvas/diagram-utils'
import {
  clonePath,
  findPathHandleAtPoint,
  findTextAtPoint,
  findTextHandleAtPoint
} from '$lib/canvas/drawing-utils'
import type { SurfaceCtx } from './context'
import {
  checkDoubleClick,
  findTopElementAtPoint,
  removeElementLocally,
  updateClickTracking
} from './element-utils'
import {
  canModifyHit,
  canModifySceneSafe,
  cursorForInteraction,
  setCursorStyle,
  updateHoverCursor
} from './cursor'
import {
  beginConnectorCreation,
  beginShapeCreation,
  finishActiveInteraction,
  updateActiveInteraction
} from './interaction-lifecycle'
import {
  continueMultiDrag,
  finishDrawing,
  finishMultiDrag,
  finishSelection
} from './drag'

export function handleSvgPointerDown(ctx: SurfaceCtx, event: PointerEvent) {
  if (!event.isPrimary) return
  if (!ctx.canEdit()) return

  const selectedTool = ctx.getSelectedTool()
  if (selectedTool === 'pencil') {
    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.setIsCurrentlyDrawing(true)
    ctx.setCurrentPath([ctx.screenToCanvasPoint(event.clientX, event.clientY)])
    return
  }

  if (selectedTool === 'eraser') {
    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
    const hit = findTopElementAtPoint(ctx, point)
    if (
      hit &&
      hit.type !== 'text' &&
      hit.type !== 'scene' &&
      ctx.canModifyElement(hit.id)
    ) {
      ctx.addHistoryCommand(
        createDeleteElementCommand(hit.element, hit.type, ctx.getUserId())
      )
      removeElementLocally(ctx, hit.id)
      ctx.deleteElement.mutate({ id: hit.id })
    }
    return
  }

  if (selectedTool === 'text') {
    event.preventDefault()
    event.stopPropagation()
    const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
    const hitText = findTextAtPoint(point, ctx.getTextElements())
    const hitShape = findShapeAtPoint(point, ctx.getShapesSafe())
    const hit = findTopElementAtPoint(ctx, point)
    const wasEditing = !!ctx.getEditingText()
    const editingText = ctx.getEditingText()

    if (editingText) {
      ctx.commitText(editingText)
    }

    if (hitShape && ctx.canModifyElement(hitShape.id)) {
      ctx.setSelectedTool('select')
      ctx.setSelectedElementIds(new Set([hitShape.id]))
      setCursorStyle(ctx, 'move')
      return
    }

    if (hit?.type === 'connector' && ctx.canModifyElement(hit.id)) {
      ctx.setSelectedTool('select')
      ctx.setSelectedElementIds(new Set([hit.id]))
      updateClickTracking(ctx, point)
      setCursorStyle(ctx, 'move')
      return
    }

    if (hitText && ctx.canModifyElement(hitText.id)) {
      ctx.formattingStore.syncTextFormattingFromElement(hitText)
      ctx.setSelectedTool('select')
      ctx.setSelectedElementIds(new Set([hitText.id]))
      updateClickTracking(ctx, point)
      setCursorStyle(ctx, 'move')
      return
    }

    if (!hitText && !wasEditing) {
      ctx.startTextEditingAtPosition(point.x, point.y, '')
    }
    return
  }

  if (selectedTool === 'shape') {
    event.preventDefault()
    event.stopPropagation()
    beginShapeCreation(
      ctx,
      event,
      ctx.screenToCanvasPoint(event.clientX, event.clientY)
    )
    return
  }

  if (selectedTool === 'connector') {
    event.preventDefault()
    event.stopPropagation()
    beginConnectorCreation(
      ctx,
      event,
      ctx.screenToCanvasPoint(event.clientX, event.clientY)
    )
    return
  }

  if (selectedTool !== 'select') {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
  const selectedIds = ctx.getSelectedElementIds()
  const handleThreshold =
    (event.pointerType === 'mouse' ? 10 : 18) / ctx.getCameraScale()

  const sceneHandle = findAnchorTargetHandleAtPoint(
    point,
    ctx.getScenesSafe(),
    selectedIds,
    handleThreshold
  )
  if (sceneHandle && canModifySceneSafe(ctx, sceneHandle.target.id)) {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.activeInteraction =
      sceneHandle.type === 'resize'
        ? {
            type: 'scene-resize',
            sceneId: sceneHandle.target.id,
            handle: sceneHandle.handle,
            original: { ...sceneHandle.target }
          }
        : {
            type: 'scene-rotate',
            sceneId: sceneHandle.target.id,
            original: { ...sceneHandle.target }
          }
    ctx.setTransformBusyScenes?.([sceneHandle.target.id])
    setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
    return
  }

  const textHandle = findTextHandleAtPoint(
    point,
    ctx.getTextElements(),
    selectedIds,
    handleThreshold
  )
  if (textHandle && ctx.canModifyElement(textHandle.text.id)) {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    switch (textHandle.type) {
      case 'resize':
        ctx.activeInteraction = {
          type: 'text-resize',
          textId: textHandle.text.id,
          handle: textHandle.handle,
          original: { ...textHandle.text }
        }
        break
      case 'rotate':
        ctx.activeInteraction = {
          type: 'text-rotate',
          textId: textHandle.text.id,
          original: { ...textHandle.text }
        }
        break
    }
    setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
    return
  }

  const shapeHandle = findShapeHandleAtPoint(
    point,
    ctx.getShapesSafe(),
    selectedIds,
    handleThreshold
  )
  if (shapeHandle && ctx.canModifyElement(shapeHandle.shape.id)) {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.activeInteraction =
      shapeHandle.type === 'resize'
        ? {
            type: 'shape-resize',
            shapeId: shapeHandle.shape.id,
            handle: shapeHandle.handle,
            original: cloneShape(shapeHandle.shape)
          }
        : {
            type: 'shape-rotate',
            shapeId: shapeHandle.shape.id,
            original: cloneShape(shapeHandle.shape)
          }
    setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
    return
  }

  const pathHandle = findPathHandleAtPoint(
    point,
    ctx.getPaths(),
    selectedIds,
    handleThreshold
  )
  if (pathHandle && ctx.canModifyElement(pathHandle.path.id)) {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.activeInteraction =
      pathHandle.type === 'resize'
        ? {
            type: 'path-resize',
            pathId: pathHandle.path.id,
            handle: pathHandle.handle,
            original: clonePath(pathHandle.path)
          }
        : {
            type: 'path-rotate',
            pathId: pathHandle.path.id,
            original: clonePath(pathHandle.path)
          }
    setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
    return
  }

  const endpointHit = findConnectorEndpointAtPoint(
    point,
    ctx.getConnectorsSafe(),
    ctx.getShapesSafe(),
    selectedIds,
    handleThreshold,
    ctx.getScenesSafe()
  )
  if (endpointHit && ctx.canModifyElement(endpointHit.connector.id)) {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.activeInteraction = {
      type: 'connector-end',
      connectorId: endpointHit.connector.id,
      end: endpointHit.end,
      original: cloneConnector(endpointHit.connector)
    }
    setCursorStyle(ctx, cursorForInteraction(ctx.activeInteraction))
    return
  }

  const hitText = findTextAtPoint(point, ctx.getTextElements())
  const hit = findTopElementAtPoint(ctx, point)
  const isDoubleClick = checkDoubleClick(ctx, point)

  if (isDoubleClick && hitText && ctx.canModifyElement(hitText.id)) {
    ctx.setSelectedElementIds(new Set())
    const editingText = ctx.getEditingText()

    if (editingText?.value.trim()) {
      ctx.commitText(editingText)
    }
    if (editingText && !editingText.value.trim()) {
      ctx.setEditingText(null)
    }

    ctx.setSelectedTool('text')
    ctx.formattingStore.syncTextFormattingFromElement(hitText)
    ctx.startTextEditingAtPosition(
      hitText.x,
      hitText.y,
      hitText.text,
      hitText.id
    )
    return
  }

  if (
    isDoubleClick &&
    hit?.type === 'scene' &&
    canModifySceneSafe(ctx, hit.id)
  ) {
    event.preventDefault()
    event.stopPropagation()
    ctx.openSceneById?.(hit.id, null)
    return
  }

  if (
    isDoubleClick &&
    hit?.type === 'connector' &&
    ctx.canModifyElement(hit.id)
  ) {
    const editingText = ctx.getEditingText()
    if (editingText?.value.trim()) {
      ctx.commitText(editingText)
    }
    if (editingText && !editingText.value.trim()) {
      ctx.setEditingText(null)
    }

    ctx.setSelectedElementIds(new Set())
    ctx.setSelectedTool('text')
    ctx.startConnectorTextEditing?.(hit.element)
    setCursorStyle(ctx, 'text')
    return
  }

  if (isDoubleClick && hit?.type === 'shape' && ctx.canModifyElement(hit.id)) {
    const editingText = ctx.getEditingText()
    if (editingText?.value.trim()) {
      ctx.commitText(editingText)
    }
    if (editingText && !editingText.value.trim()) {
      ctx.setEditingText(null)
    }

    ctx.setSelectedElementIds(new Set())
    ctx.setSelectedTool('text')
    ctx.startShapeTextEditing?.(hit.element)
    setCursorStyle(ctx, 'text')
    return
  }

  updateClickTracking(ctx, point)
  const hitElementId = hit && canModifyHit(ctx, hit) ? hit.id : undefined

  if (hitElementId && hit) {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.pendingDrag = { elementId: hitElementId, startPos: point }
    setCursorStyle(ctx, 'move')
    if (!selectedIds.has(hitElementId)) {
      ctx.setSelectedElementIds(new Set([hitElementId]))
      switch (hit.type) {
        case 'shape':
          ctx.formattingStore.syncDiagramFormattingFromShape(hit.element)
          break
        case 'connector':
          ctx.formattingStore.syncDiagramFormattingFromConnector(hit.element)
          break
        case 'path':
          ctx.formattingStore.syncDrawFormattingFromPath(hit.element)
          break
      }
    }
  } else {
    ;(event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId)
    ctx.setIsSelecting(true)
    ctx.setSelectionStart(point)
    ctx.setSelectionEnd(point)
    setCursorStyle(ctx, null)
    ctx.setSelectedElementIds(new Set())
  }
}

export function handleSvgPointerMove(ctx: SurfaceCtx, event: PointerEvent) {
  if (updateActiveInteraction(ctx, event)) {
    return
  }

  if (ctx.getIsSelecting() && ctx.getSelectionStart()) {
    event.preventDefault()
    event.stopPropagation()
    ctx.setSelectionEnd(ctx.screenToCanvasPoint(event.clientX, event.clientY))
    return
  }

  if (continueMultiDrag(ctx, event)) {
    return
  }

  if (
    ctx.getSelectedTool() === 'pencil' &&
    ctx.getIsCurrentlyDrawing() &&
    event.isPrimary
  ) {
    event.preventDefault()
    event.stopPropagation()
    const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
    if (ctx.formattingStore.drawFormatting.style === 'straight') {
      const start = ctx.getCurrentPath()[0]
      ctx.setCurrentPath(start ? [start, point] : [point])
    } else {
      ctx.setCurrentPath([...ctx.getCurrentPath(), point])
    }
    return
  }

  updateHoverCursor(ctx, event)
}

export function handleSvgPointerUp(ctx: SurfaceCtx, event: PointerEvent) {
  if (
    (event.currentTarget as SVGSVGElement).hasPointerCapture(event.pointerId)
  ) {
    ;(event.currentTarget as SVGSVGElement).releasePointerCapture(
      event.pointerId
    )
  }

  if (finishActiveInteraction(ctx, event)) {
    ctx.pendingDrag = null
    return
  }

  ctx.pendingDrag = null

  if (finishSelection(ctx)) {
    updateHoverCursor(ctx, event)
    return
  }
  if (finishMultiDrag(ctx)) {
    updateHoverCursor(ctx, event)
    return
  }
  finishDrawing(ctx)
  updateHoverCursor(ctx, event)
}
