import type { CanvasVisibility } from '$lib/canvas/schema'

export type CanvasVisibilityChangedPayload = {
  canvasId: string
  visibility: CanvasVisibility
}
