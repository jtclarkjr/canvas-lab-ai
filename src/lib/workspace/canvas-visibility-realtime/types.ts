import type { CanvasVisibility } from '#lib/canvas/schema.js'

export type CanvasVisibilityChangedPayload = {
  canvasId: string
  visibility: CanvasVisibility
}
