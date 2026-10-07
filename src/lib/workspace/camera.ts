import type { Camera, Point } from '#lib/canvas/types.js'

type CameraViewport = {
  width: number
  height: number
}

export function constrainScale(scale: number) {
  return Math.min(Math.max(scale, 0.1), 5)
}

export function zoomCamera(camera: Camera, factor: number): Camera {
  return { ...camera, scale: constrainScale(camera.scale * factor) }
}

export function resetCamera(): Camera {
  return { x: 0, y: 0, scale: 1 }
}

export function centerCameraOnCanvasPoint(
  camera: Camera,
  point: Point,
  viewport: CameraViewport
): Camera {
  return {
    x: viewport.width / 2 - point.x * camera.scale,
    y: viewport.height / 2 - point.y * camera.scale,
    scale: camera.scale
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('workspace camera', () => {
    it('centers a canvas point in the viewport', () => {
      expect(
        centerCameraOnCanvasPoint(
          { x: 40, y: -20, scale: 1 },
          { x: 100, y: 50 },
          { width: 800, height: 600 }
        )
      ).toEqual({ x: 300, y: 250, scale: 1 })
    })

    it('preserves the current zoom while centering', () => {
      expect(
        centerCameraOnCanvasPoint(
          { x: 0, y: 0, scale: 2 },
          { x: 100, y: 50 },
          { width: 800, height: 600 }
        )
      ).toEqual({ x: 200, y: 200, scale: 2 })
    })
  })
}
