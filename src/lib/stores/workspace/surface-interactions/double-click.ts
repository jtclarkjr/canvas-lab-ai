import { findTextAtPoint } from '$lib/canvas/drawing-utils'
import type { SurfaceCtx } from './context/types'
import {
  findTopElementAtPoint,
  isConnectorElement,
  isShapeElement
} from './element-utils'
import { canModifySceneSafe, setCursorStyle } from './cursor'

export function handleSvgDoubleClick(ctx: SurfaceCtx, event: MouseEvent) {
  if (!ctx.canEdit()) return
  const editingTarget = ctx.getEditingText()?.target
  if (editingTarget === 'shape' || editingTarget === 'connector') return
  const point = ctx.screenToCanvasPoint(event.clientX, event.clientY)
  const hitText = findTextAtPoint(point, ctx.getTextElements())
  const hit = findTopElementAtPoint(ctx, point)

  if (hitText && ctx.canModifyElement(hitText.id)) {
    event.preventDefault()
    event.stopPropagation()

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

  if (hit?.type === 'scene' && canModifySceneSafe(ctx, hit.id)) {
    event.preventDefault()
    event.stopPropagation()
    ctx.openSceneById?.(hit.id, null)
    return
  }

  if (
    hit?.type === 'connector' &&
    isConnectorElement(hit.element) &&
    ctx.canModifyElement(hit.id)
  ) {
    event.preventDefault()
    event.stopPropagation()

    const editingText = ctx.getEditingText()
    if (editingText?.value.trim()) {
      ctx.commitText(editingText)
    }
    if (editingText && !editingText.value.trim()) {
      ctx.setEditingText(null)
    }

    ctx.setSelectedTool('text')
    ctx.setSelectedElementIds(new Set())
    ctx.startConnectorTextEditing?.(hit.element)
    setCursorStyle(ctx, 'text')
    return
  }

  if (
    hit?.type !== 'shape' ||
    !isShapeElement(hit.element) ||
    !ctx.canModifyElement(hit.id)
  ) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const editingText = ctx.getEditingText()
  if (editingText?.value.trim()) {
    ctx.commitText(editingText)
  }
  if (editingText && !editingText.value.trim()) {
    ctx.setEditingText(null)
  }

  ctx.setSelectedTool('text')
  ctx.setSelectedElementIds(new Set())
  ctx.startShapeTextEditing?.(hit.element)
  setCursorStyle(ctx, 'text')
}
