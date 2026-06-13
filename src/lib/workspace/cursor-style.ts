import type { Tool } from '$lib/canvas/types'

export function getWorkspaceCursorStyle(
  isViewportDragging: boolean,
  selectedTool: Tool
) {
  if (isViewportDragging) return 'grabbing'

  switch (selectedTool) {
    case 'pencil':
      return 'crosshair'
    case 'eraser':
      return 'pointer'
    case 'text':
      return 'text'
    case 'shape':
    case 'connector':
      return 'crosshair'
    case 'hand':
      return 'grab'
    default:
      return 'default'
  }
}
