import type { WorkspaceSurfaceInteractionsInput } from './types'
import { createSurfaceCtx } from './context'
import {
  handleSvgPointerDown,
  handleSvgPointerMove,
  handleSvgPointerUp
} from './pointer-handlers'
import { handleSvgDoubleClick } from './double-click'
import { deleteSelectedElements } from './drag'
import {
  arrangeSelectedElements,
  setConnectorKind,
  setDiagramEndArrow,
  setDiagramFillColor,
  setDiagramOpacity,
  setDiagramStartArrow,
  setDiagramStrokeColor,
  setDiagramStrokeStyle,
  setDiagramStrokeWidth,
  setDrawColor,
  setDrawStyle,
  setDrawWidth,
  setHighlighterOpacity,
  setShapeKind,
  toggleHighlighter
} from './formatting'

export type { WorkspaceSurfaceInteractionsInput }

export function createWorkspaceSurfaceInteractionsStore(
  config: WorkspaceSurfaceInteractionsInput
) {
  const ctx = createSurfaceCtx(config)

  return {
    deleteSelectedElements: () => deleteSelectedElements(ctx),
    handleSvgPointerDown: (event: PointerEvent) =>
      handleSvgPointerDown(ctx, event),
    handleSvgPointerMove: (event: PointerEvent) =>
      handleSvgPointerMove(ctx, event),
    handleSvgPointerUp: (event: PointerEvent) => handleSvgPointerUp(ctx, event),
    handleSvgDoubleClick: (event: MouseEvent) =>
      handleSvgDoubleClick(ctx, event),
    setShapeKind: (kind: Parameters<typeof setShapeKind>[1]) =>
      setShapeKind(ctx, kind),
    setConnectorKind: (kind: Parameters<typeof setConnectorKind>[1]) =>
      setConnectorKind(ctx, kind),
    setDiagramFillColor: (fillColor: string) =>
      setDiagramFillColor(ctx, fillColor),
    setDiagramStrokeColor: (strokeColor: string) =>
      setDiagramStrokeColor(ctx, strokeColor),
    setDiagramStrokeWidth: (strokeWidth: number) =>
      setDiagramStrokeWidth(ctx, strokeWidth),
    setDiagramStrokeStyle: (
      strokeStyle: Parameters<typeof setDiagramStrokeStyle>[1]
    ) => setDiagramStrokeStyle(ctx, strokeStyle),
    setDiagramOpacity: (opacity: number) => setDiagramOpacity(ctx, opacity),
    setDiagramStartArrow: (
      startArrow: Parameters<typeof setDiagramStartArrow>[1]
    ) => setDiagramStartArrow(ctx, startArrow),
    setDiagramEndArrow: (endArrow: Parameters<typeof setDiagramEndArrow>[1]) =>
      setDiagramEndArrow(ctx, endArrow),
    setDrawWidth: (width: number) => setDrawWidth(ctx, width),
    setDrawColor: (color: string) => setDrawColor(ctx, color),
    setDrawStyle: (style: Parameters<typeof setDrawStyle>[1]) =>
      setDrawStyle(ctx, style),
    toggleHighlighter: () => toggleHighlighter(ctx),
    setHighlighterOpacity: (opacity: number) =>
      setHighlighterOpacity(ctx, opacity),
    arrangeSelectedElements: (
      action: Parameters<typeof arrangeSelectedElements>[1]
    ) => arrangeSelectedElements(ctx, action),
    get hasShapeSelection() {
      const selectedIds = ctx.getSelectedElementIds()
      return ctx.getShapesSafe().some((shape) => selectedIds.has(shape.id))
    },
    get hasConnectorSelection() {
      const selectedIds = ctx.getSelectedElementIds()
      return ctx
        .getConnectorsSafe()
        .some((connector) => selectedIds.has(connector.id))
    },
    get hasPathSelection() {
      const selectedIds = ctx.getSelectedElementIds()
      return ctx.getPaths().some((path) => selectedIds.has(path.id))
    }
  }
}
