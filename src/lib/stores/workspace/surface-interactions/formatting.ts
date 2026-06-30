import {
  cloneCanvasElement,
  createUpdateMultipleCommand
} from '$lib/canvas/commands'
import { cloneConnector, cloneShape } from '$lib/canvas/diagram-utils'
import type {
  Arrowhead,
  ArrangementAction,
  CanvasDrawableElement,
  CanvasElementType,
  ConnectorKind,
  DiagramConnector,
  DiagramShape,
  DrawStyle,
  Path,
  ShapeKind,
  StrokeStyle
} from './types'
import type { SurfaceCtx } from './context'
import {
  allElements,
  isShapeElement,
  isTextElement,
  persistElement
} from './element-utils'

export function updateSelectedPathElements(
  ctx: SurfaceCtx,
  pathUpdater: (path: Path) => Path
) {
  const selectedIds = ctx.getSelectedElementIds()
  const updates: Array<{
    id: string
    type: CanvasElementType
    before: CanvasDrawableElement
    after: CanvasDrawableElement
  }> = []

  ctx.setPaths((previous) =>
    previous.map((path) => {
      if (!selectedIds.has(path.id) || !ctx.canModifyElement(path.id)) {
        return path
      }
      const after = pathUpdater(path)
      updates.push({
        id: path.id,
        type: 'path',
        before: cloneCanvasElement(path, 'path'),
        after
      })
      return after
    })
  )

  if (updates.length > 0) {
    ctx.addHistoryCommand(createUpdateMultipleCommand(updates, ctx.getUserId()))
    for (const update of updates) {
      persistElement(ctx, update.type, update.after)
    }
  }
}

export function updateSelectedDiagramElements(
  ctx: SurfaceCtx,
  shapeUpdater: ((shape: DiagramShape) => DiagramShape) | null,
  connectorUpdater: ((connector: DiagramConnector) => DiagramConnector) | null
) {
  const selectedIds = ctx.getSelectedElementIds()
  const updates: Array<{
    id: string
    type: CanvasElementType
    before: CanvasDrawableElement
    after: CanvasDrawableElement
  }> = []

  if (shapeUpdater) {
    ctx.setShapesSafe((previous) =>
      previous.map((shape) => {
        if (!selectedIds.has(shape.id) || !ctx.canModifyElement(shape.id)) {
          return shape
        }
        const after = shapeUpdater(shape)
        updates.push({
          id: shape.id,
          type: 'shape',
          before: cloneShape(shape),
          after
        })
        return after
      })
    )
  }

  if (connectorUpdater) {
    ctx.setConnectorsSafe((previous) =>
      previous.map((connector) => {
        if (
          !selectedIds.has(connector.id) ||
          !ctx.canModifyElement(connector.id)
        ) {
          return connector
        }
        const after = connectorUpdater(connector)
        updates.push({
          id: connector.id,
          type: 'connector',
          before: cloneConnector(connector),
          after
        })
        return after
      })
    )
  }

  if (updates.length > 0) {
    ctx.addHistoryCommand(createUpdateMultipleCommand(updates, ctx.getUserId()))
    for (const update of updates) {
      persistElement(ctx, update.type, update.after)
    }
  }
}

export function setDrawWidth(ctx: SurfaceCtx, width: number) {
  ctx.formattingStore.setDrawWidth(width)
  updateSelectedPathElements(ctx, (path) => ({ ...path, width }))
}

export function setDrawColor(ctx: SurfaceCtx, color: string) {
  ctx.formattingStore.setDrawColor(color)
  updateSelectedPathElements(ctx, (path) => ({ ...path, color }))
}

export function setDrawStyle(ctx: SurfaceCtx, style: DrawStyle) {
  ctx.formattingStore.setDrawStyle(style)
}

export function toggleHighlighter(ctx: SurfaceCtx) {
  const isHighlighter = !ctx.formattingStore.drawFormatting.isHighlighter
  ctx.formattingStore.toggleHighlighter()
  updateSelectedPathElements(ctx, (path) => ({
    ...path,
    opacity: isHighlighter
      ? ctx.formattingStore.drawFormatting.highlighterOpacity
      : 1
  }))
}

export function setHighlighterOpacity(
  ctx: SurfaceCtx,
  highlighterOpacity: number
) {
  ctx.formattingStore.setHighlighterOpacity(highlighterOpacity)
  if (!ctx.formattingStore.drawFormatting.isHighlighter) return
  updateSelectedPathElements(ctx, (path) => ({
    ...path,
    opacity: highlighterOpacity
  }))
}

export function setShapeKind(ctx: SurfaceCtx, kind: ShapeKind) {
  ctx.formattingStore.setShapeKind(kind)
  updateSelectedDiagramElements(ctx, (shape) => ({ ...shape, kind }), null)
}

export function setConnectorKind(ctx: SurfaceCtx, kind: ConnectorKind) {
  ctx.formattingStore.setConnectorKind(kind)
  updateSelectedDiagramElements(ctx, null, (connector) => ({
    ...connector,
    kind
  }))
}

export function setDiagramFillColor(ctx: SurfaceCtx, fillColor: string) {
  ctx.formattingStore.setDiagramFillColor(fillColor)
  updateSelectedDiagramElements(ctx, (shape) => ({ ...shape, fillColor }), null)
}

export function setDiagramStrokeColor(ctx: SurfaceCtx, strokeColor: string) {
  ctx.formattingStore.setDiagramStrokeColor(strokeColor)
  updateSelectedDiagramElements(
    ctx,
    (shape) => ({ ...shape, strokeColor }),
    (connector) => ({ ...connector, strokeColor })
  )
}

export function setDiagramStrokeWidth(ctx: SurfaceCtx, strokeWidth: number) {
  ctx.formattingStore.setDiagramStrokeWidth(strokeWidth)
  updateSelectedDiagramElements(
    ctx,
    (shape) => ({ ...shape, strokeWidth }),
    (connector) => ({ ...connector, strokeWidth })
  )
}

export function setDiagramStrokeStyle(
  ctx: SurfaceCtx,
  strokeStyle: StrokeStyle
) {
  ctx.formattingStore.setDiagramStrokeStyle(strokeStyle)
  updateSelectedDiagramElements(
    ctx,
    (shape) => ({ ...shape, strokeStyle }),
    (connector) => ({ ...connector, strokeStyle })
  )
}

export function setDiagramOpacity(ctx: SurfaceCtx, opacity: number) {
  ctx.formattingStore.setDiagramOpacity(opacity)
  updateSelectedDiagramElements(
    ctx,
    (shape) => ({ ...shape, opacity }),
    (connector) => ({ ...connector, opacity })
  )
}

export function setDiagramStartArrow(ctx: SurfaceCtx, startArrow: Arrowhead) {
  ctx.formattingStore.setDiagramStartArrow(startArrow)
  updateSelectedDiagramElements(ctx, null, (connector) => ({
    ...connector,
    startArrow
  }))
}

export function setDiagramEndArrow(ctx: SurfaceCtx, endArrow: Arrowhead) {
  ctx.formattingStore.setDiagramEndArrow(endArrow)
  updateSelectedDiagramElements(ctx, null, (connector) => ({
    ...connector,
    endArrow
  }))
}

export function arrangeSelectedElements(
  ctx: SurfaceCtx,
  action: ArrangementAction
) {
  const selectedIds = ctx.getSelectedElementIds()
  if (selectedIds.size === 0) return
  const elements = allElements(ctx).filter(
    (entry): entry is Extract<typeof entry, { type: CanvasElementType }> =>
      entry.type !== 'scene'
  )
  const zValues = elements.map((entry) => entry.element.z ?? 0)
  const maxZ = Math.max(...zValues, 0)
  const minZ = Math.min(...zValues, 0)
  const updates: Array<{
    id: string
    type: CanvasElementType
    before: CanvasDrawableElement
    after: CanvasDrawableElement
  }> = []

  function nextZ(index: number, current: number | null | undefined) {
    if (action === 'front') return maxZ + index + 1
    if (action === 'back') return minZ - index - 1
    if (action === 'forward') return (current ?? 0) + 1000
    return (current ?? 0) - 1000
  }

  let selectedIndex = 0
  for (const entry of elements) {
    if (!selectedIds.has(entry.id) || !ctx.canModifyElement(entry.id)) {
      continue
    }
    selectedIndex += 1
    const after = {
      ...entry.element,
      z: nextZ(selectedIndex, entry.element.z)
    } as CanvasDrawableElement
    updates.push({
      id: entry.id,
      type: entry.type,
      before: cloneCanvasElement(entry.element, entry.type),
      after
    })
  }

  if (updates.length === 0) return

  ctx.setPaths((previous) =>
    previous.map((path) => {
      const update = updates.find((entry) => entry.id === path.id)
      return update && update.type === 'path' && 'points' in update.after
        ? update.after
        : path
    })
  )
  ctx.setTextElements((previous) =>
    previous.map((text) => {
      const update = updates.find((entry) => entry.id === text.id)
      return update && update.type === 'text' && isTextElement(update.after)
        ? update.after
        : text
    })
  )
  ctx.setShapesSafe((previous) =>
    previous.map((shape) => {
      const update = updates.find((entry) => entry.id === shape.id)
      return update && update.type === 'shape' && isShapeElement(update.after)
        ? update.after
        : shape
    })
  )
  ctx.setConnectorsSafe((previous) =>
    previous.map((connector) => {
      const update = updates.find((entry) => entry.id === connector.id)
      return update && update.type === 'connector' && 'start' in update.after
        ? update.after
        : connector
    })
  )

  ctx.addHistoryCommand(createUpdateMultipleCommand(updates, ctx.getUserId()))
  for (const update of updates) {
    persistElement(ctx, update.type, update.after)
  }
}
