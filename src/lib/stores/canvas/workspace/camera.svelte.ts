import type { Camera, Point, Tool } from '$lib/canvas/types'
import { screenToCanvas } from '$lib/canvas/drawing-utils'
import { constrainScale, resetCamera, zoomCamera } from '$lib/canvas/helpers/camera'
import { getWorkspaceCursorStyle } from '$lib/canvas/helpers/workspace-cursor-style'

type WorkspaceCameraInput = {
  getActiveCanvasId: () => string
  getRootElement: () => HTMLDivElement | null
  getSelectedTool: () => Tool
}

const cameraFallback: Camera = { x: 0, y: 0, scale: 1 }

export function createWorkspaceCameraStore({
  getActiveCanvasId,
  getRootElement,
  getSelectedTool
}: WorkspaceCameraInput) {
  let camera = $state<Camera>(cameraFallback)
  let isViewportDragging = $state(false)
  let lastPointerPos = { x: 0, y: 0 }
  let touchStart: {
    touches: Array<{ x: number; y: number }>
    distance: number
  } | null = null
  let initialCamera: Camera | null = null

  function screenToCanvasPoint(
    svgEl: SVGSVGElement | null,
    clientX: number,
    clientY: number
  ): Point {
    if (!svgEl) {
      return { x: 0, y: 0 }
    }

    return screenToCanvas(clientX, clientY, svgEl.getBoundingClientRect(), camera)
  }

  function loadCameraState(id: string) {
    const stored =
      typeof localStorage !== 'undefined' ? localStorage.getItem(`canvas-camera-${id}`) : null

    if (!stored) {
      camera = resetCamera()
      return
    }

    try {
      const parsed = JSON.parse(stored) as Partial<Camera>
      camera =
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        typeof parsed.scale === 'number'
          ? { x: parsed.x, y: parsed.y, scale: parsed.scale }
          : resetCamera()
    } catch {
      camera = resetCamera()
    }
  }

  function handleViewportPointerDown(event: PointerEvent) {
    if (getSelectedTool() !== 'hand') return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if ((event.target as Element).closest('button, a, input, [role="button"]')) return

    if (event.pointerType !== 'mouse') {
      event.preventDefault()
    }

    ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
    isViewportDragging = true
    lastPointerPos = { x: event.clientX, y: event.clientY }
  }

  function handleViewportPointerMove(event: PointerEvent) {
    if (!isViewportDragging) return
    if (event.pointerType !== 'mouse') {
      event.preventDefault()
    }

    const dx = event.clientX - lastPointerPos.x
    const dy = event.clientY - lastPointerPos.y
    camera = {
      ...camera,
      x: camera.x + dx,
      y: camera.y + dy
    }
    lastPointerPos = { x: event.clientX, y: event.clientY }
  }

  function handleViewportPointerUp(event: PointerEvent) {
    isViewportDragging = false
    if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
      ;(event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId)
    }
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1 && getSelectedTool() === 'hand') {
      event.preventDefault()
      const touch = event.touches[0]
      if (!touch) return

      touchStart = {
        touches: [{ x: touch.clientX, y: touch.clientY }],
        distance: 0
      }
      initialCamera = { ...camera }
      return
    }

    if (event.touches.length >= 2) {
      event.preventDefault()

      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      if (!touch1 || !touch2) return

      const touches = [
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      ]
      const distance = Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y)

      touchStart = { touches, distance }
      initialCamera = { ...camera }
    } else {
      touchStart = null
      initialCamera = null
    }
  }

  function handleTouchMove(event: TouchEvent) {
    const rootEl = getRootElement()
    if (!touchStart || !initialCamera) {
      return
    }

    if (event.touches.length === 1 && touchStart.touches.length === 1) {
      event.preventDefault()
      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - touchStart.touches[0].x
      const dy = touch.clientY - touchStart.touches[0].y

      camera = {
        x: initialCamera.x + dx,
        y: initialCamera.y + dy,
        scale: initialCamera.scale
      }
      return
    }

    if (event.touches.length >= 2 && touchStart.touches.length >= 2 && rootEl) {
      event.preventDefault()

      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      if (!touch1 || !touch2) return

      const currentTouches = [
        { x: touch1.clientX, y: touch1.clientY },
        { x: touch2.clientX, y: touch2.clientY }
      ]

      const currentDistance = Math.hypot(
        currentTouches[1].x - currentTouches[0].x,
        currentTouches[1].y - currentTouches[0].y
      )
      const scaleChange = currentDistance / touchStart.distance
      const newScale = constrainScale(initialCamera.scale * scaleChange)

      const startMidpoint = {
        x: (touchStart.touches[0].x + touchStart.touches[1].x) / 2,
        y: (touchStart.touches[0].y + touchStart.touches[1].y) / 2
      }
      const currentMidpoint = {
        x: (currentTouches[0].x + currentTouches[1].x) / 2,
        y: (currentTouches[0].y + currentTouches[1].y) / 2
      }
      const panDelta = {
        x: currentMidpoint.x - startMidpoint.x,
        y: currentMidpoint.y - startMidpoint.y
      }

      const rect = rootEl.getBoundingClientRect()
      const pinchCenterX = currentMidpoint.x - rect.left
      const pinchCenterY = currentMidpoint.y - rect.top
      const scaleRatio = newScale / initialCamera.scale
      const newX = pinchCenterX - (pinchCenterX - initialCamera.x - panDelta.x) * scaleRatio
      const newY = pinchCenterY - (pinchCenterY - initialCamera.y - panDelta.y) * scaleRatio

      camera = {
        x: newX,
        y: newY,
        scale: newScale
      }
    }
  }

  function handleTouchEnd() {
    touchStart = null
    initialCamera = null
  }

  function zoomIn() {
    camera = zoomCamera(camera, 1.2)
  }

  function zoomOut() {
    camera = zoomCamera(camera, 0.8)
  }

  function resetView() {
    camera = resetCamera()
  }

  $effect(() => {
    const activeCanvasId = getActiveCanvasId()
    if (typeof localStorage !== 'undefined' && activeCanvasId) {
      localStorage.setItem(`canvas-camera-${activeCanvasId}`, JSON.stringify(camera))
    }
  })

  $effect(() => {
    const rootEl = getRootElement()
    if (!rootEl) return

    const wheelHandler = (event: WheelEvent) => {
      event.preventDefault()
      const rect = rootEl?.getBoundingClientRect()
      if (!rect) return

      if (event.ctrlKey || event.metaKey) {
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
        const newScale = constrainScale(camera.scale * zoomFactor)
        const scaleChange = newScale / camera.scale

        camera = {
          x: mouseX - (mouseX - camera.x) * scaleChange,
          y: mouseY - (mouseY - camera.y) * scaleChange,
          scale: newScale
        }
      } else {
        const dx = event.shiftKey ? -event.deltaY : -event.deltaX
        const dy = event.shiftKey ? 0 : -event.deltaY

        camera = {
          ...camera,
          x: camera.x + dx,
          y: camera.y + dy
        }
      }
    }

    rootEl.addEventListener('wheel', wheelHandler, { passive: false })
    return () => rootEl?.removeEventListener('wheel', wheelHandler)
  })

  return {
    screenToCanvasPoint,
    loadCameraState,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
    resetView,
    get camera() {
      return camera
    },
    get rootStyle() {
      return `cursor:${getWorkspaceCursorStyle(
        isViewportDragging,
        getSelectedTool()
      )};overscroll-behavior:none;touch-action:none`
    }
  }
}
