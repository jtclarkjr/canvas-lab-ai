import type {
  Camera,
  Path,
  Point,
  TextElement
} from '$lib/canvas/types'

export const TEXT_LINE_HEIGHT = 1.25

export function getTextLineHeight(fontSize: number): number {
  return fontSize * TEXT_LINE_HEIGHT
}

export function textElementToData(text: TextElement): {
  text: string
  color: string
  fontSize: number
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
} {
  return {
    text: text.text,
    color: text.color,
    fontSize: text.fontSize,
    isBold: text.isBold,
    isItalic: text.isItalic,
    isUnderline: text.isUnderline
  }
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2)
  }
  const t = Math.min(
    Math.max(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0),
    1
  )
  const closestX = start.x + t * dx
  const closestY = start.y + t * dy
  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)
}

export function isPointNearPath(
  point: Point,
  path: Path,
  threshold: number
): boolean {
  const [first] = path.points
  if (!first) return false

  if (path.points.length === 1) {
    return Math.sqrt((point.x - first.x) ** 2 + (point.y - first.y) ** 2) < threshold
  }

  for (let i = 0; i < path.points.length - 1; i += 1) {
    const start = path.points[i]
    const end = path.points[i + 1]
    if (start && end && distanceToSegment(point, start, end) < threshold) {
      return true
    }
  }
  return false
}

export function isElementInSelection(
  element: Path | TextElement,
  selectionRect: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  if ('text' in element) {
    return (
      element.x >= selectionRect.x1 &&
      element.x <= selectionRect.x2 &&
      element.y >= selectionRect.y1 &&
      element.y <= selectionRect.y2
    )
  }

  return element.points.some(
    (point) =>
      point.x >= selectionRect.x1 &&
      point.x <= selectionRect.x2 &&
      point.y >= selectionRect.y1 &&
      point.y <= selectionRect.y2
  )
}

export function findTextAtPoint(
  point: Point,
  textElements: TextElement[]
): TextElement | null {
  for (let i = textElements.length - 1; i >= 0; i -= 1) {
    const text = textElements[i]
    if (!text || !text.text) continue
    const bounds = calculateTextBounds(text)
    const withinX = point.x >= bounds.x && point.x <= bounds.x + bounds.width
    const withinY = point.y >= bounds.y && point.y <= bounds.y + bounds.height
    if (withinX && withinY) {
      return text
    }
  }
  return null
}

export function screenToCanvas(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
  camera: Camera
): Point {
  return {
    x: (clientX - svgRect.left - camera.x) / camera.scale,
    y: (clientY - svgRect.top - camera.y) / camera.scale
  }
}

export function pathToSvgPath(points: Point[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  if (!first) return ''
  let d = `M ${first.x} ${first.y}`
  for (const point of rest) {
    d += ` L ${point.x} ${point.y}`
  }
  return d
}

export function calculateTextBounds(text: TextElement) {
  const lines = text.text.split('\n')
  const longestLine = Math.max(...lines.map((line) => line.length), 1)
  const width = longestLine * text.fontSize * 0.6 + 8
  const height = (lines.length - 1) * getTextLineHeight(text.fontSize) + text.fontSize + 8
  return {
    x: text.x - 4,
    y: text.y - 4,
    width,
    height
  }
}
