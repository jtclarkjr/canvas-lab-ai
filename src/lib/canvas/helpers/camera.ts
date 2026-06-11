import type { Camera } from '$lib/canvas/types'

export function constrainScale(scale: number) {
  return Math.min(Math.max(scale, 0.1), 5)
}

export function zoomCamera(camera: Camera, factor: number): Camera {
  return { ...camera, scale: constrainScale(camera.scale * factor) }
}

export function resetCamera(): Camera {
  return { x: 0, y: 0, scale: 1 }
}
