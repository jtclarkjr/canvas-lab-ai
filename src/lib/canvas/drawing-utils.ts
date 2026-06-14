import type { Camera, Path, Point, TextElement } from '$lib/canvas/types'
import {
  getShapeResizeCursor,
  rotatePoint,
  unrotatePoint
} from '$lib/canvas/diagram-utils'

export const TEXT_LINE_HEIGHT = 1.25
export const TEXT_BOUNDS_PADDING = 4
export const TEXT_EDITOR_MIN_WIDTH = 120
export const TEXT_EDITOR_WIDTH_PADDING = 16
const TEXT_ROTATE_HANDLE_LENGTH = 32
const PATH_ROTATE_HANDLE_LENGTH = 32
const MIN_TEXT_FONT_SIZE = 6
const MAX_TEXT_FONT_SIZE = 256

const CANVAS_FONT_FAMILY =
  "'Avenir Next', Avenir, 'Segoe UI', ui-sans-serif, system-ui, sans-serif"

let _measureCtx: CanvasRenderingContext2D | null | undefined

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (_measureCtx === undefined) {
    if (typeof document === 'undefined') {
      _measureCtx = null
    } else {
      _measureCtx = document.createElement('canvas').getContext('2d')
    }
  }
  return _measureCtx
}

function measureTextWidth(
  text: string,
  fontSize: number,
  isBold: boolean,
  isItalic: boolean
): number {
  const ctx = getMeasureCtx()
  if (!ctx) return text.length * fontSize * 0.6
  ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${CANVAS_FONT_FAMILY}`
  const m = ctx.measureText(text)
  // actualBoundingBox gives true ink extent; fall back to advance width
  if (
    m.actualBoundingBoxLeft !== undefined &&
    m.actualBoundingBoxRight !== undefined
  ) {
    return m.actualBoundingBoxLeft + m.actualBoundingBoxRight
  }
  return m.width
}

export type TextResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

export type TextHandleHit =
  | { type: 'resize'; handle: TextResizeHandle; text: TextElement }
  | { type: 'rotate'; text: TextElement }

export type PathResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

export type PathHandleHit =
  | { type: 'resize'; handle: PathResizeHandle; path: Path }
  | { type: 'rotate'; path: Path }

export function getTextLineHeight(fontSize: number): number {
  return fontSize * TEXT_LINE_HEIGHT
}

export function getTextLines(value: string): string[] {
  return value.split('\n')
}

export function getTextContentWidth(lines: string[], fontSize: number): number {
  const longestLine = Math.max(...lines.map((line) => line.length), 1)
  return longestLine * fontSize * 0.6
}

export function getTextLineTop(
  text: Pick<TextElement, 'y' | 'fontSize'>,
  lineIndex: number
): number {
  return text.y + lineIndex * getTextLineHeight(text.fontSize)
}

export function getTextLineBaseline(
  text: Pick<TextElement, 'y' | 'fontSize'>,
  lineIndex: number
): number {
  return getTextLineTop(text, lineIndex) + text.fontSize
}

export function getTextEditorWidth(
  lines: string[],
  fontSize: number,
  scale: number
): number {
  return Math.max(
    TEXT_EDITOR_MIN_WIDTH,
    getTextContentWidth(lines, fontSize) * scale + TEXT_EDITOR_WIDTH_PADDING
  )
}

export function textElementToData(text: TextElement): {
  text: string
  color: string
  fontSize: number
  rotation: number
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
} {
  return {
    text: text.text,
    color: text.color,
    fontSize: text.fontSize,
    rotation: text.rotation ?? 0,
    isBold: text.isBold,
    isItalic: text.isItalic,
    isUnderline: text.isUnderline
  }
}

function distance(pointA: Point, pointB: Point): number {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y)
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2)
  }
  const t = Math.min(
    Math.max(
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
      0
    ),
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
    return (
      Math.sqrt((point.x - first.x) ** 2 + (point.y - first.y) ** 2) < threshold
    )
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
  const isPointInSelection = (point: Point) =>
    point.x >= selectionRect.x1 &&
    point.x <= selectionRect.x2 &&
    point.y >= selectionRect.y1 &&
    point.y <= selectionRect.y2

  if ('text' in element) {
    return [...getTextOutlinePoints(element), getTextCenter(element)].some(
      isPointInSelection
    )
  }

  return element.points.some(isPointInSelection)
}

export function getTextCenter(text: TextElement): Point {
  const bounds = calculateTextBounds(text)
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

export function getTextOutlinePoints(text: TextElement): Point[] {
  const bounds = calculateTextBounds(text)
  const center = getTextCenter(text)
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ].map((point) => rotatePoint(point, center, text.rotation ?? 0))
}

export function getTextResizeHandles(
  text: TextElement
): Array<{ handle: TextResizeHandle; point: Point }> {
  const [nw, ne, se, sw] = getTextOutlinePoints(text)
  const bounds = calculateTextBounds(text)
  return [
    { handle: 'nw', point: nw ?? { x: bounds.x, y: bounds.y } },
    { handle: 'ne', point: ne ?? { x: bounds.x + bounds.width, y: bounds.y } },
    {
      handle: 'se',
      point: se ?? { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    },
    { handle: 'sw', point: sw ?? { x: bounds.x, y: bounds.y + bounds.height } }
  ]
}

export function getTextRotateAnchor(text: TextElement): Point {
  const [nw, ne] = getTextOutlinePoints(text)
  if (nw && ne) {
    return {
      x: nw.x + (ne.x - nw.x) / 2,
      y: nw.y + (ne.y - nw.y) / 2
    }
  }
  return getTextCenter(text)
}

export function getTextRotateHandle(text: TextElement): Point {
  const top = getTextRotateAnchor(text)
  const center = getTextCenter(text)
  const dx = top.x - center.x
  const dy = top.y - center.y
  const magnitude = Math.max(Math.hypot(dx, dy), 1)
  return {
    x: top.x + (dx / magnitude) * TEXT_ROTATE_HANDLE_LENGTH,
    y: top.y + (dy / magnitude) * TEXT_ROTATE_HANDLE_LENGTH
  }
}

export function getTextResizeCursor(
  handle: TextResizeHandle,
  rotation: number
): string {
  return getShapeResizeCursor(handle, rotation)
}

export function isPointInText(point: Point, text: TextElement): boolean {
  const bounds = calculateTextBounds(text)
  const center = getTextCenter(text)
  const localPoint = unrotatePoint(point, center, text.rotation ?? 0)
  return (
    localPoint.x >= bounds.x &&
    localPoint.x <= bounds.x + bounds.width &&
    localPoint.y >= bounds.y &&
    localPoint.y <= bounds.y + bounds.height
  )
}

export function findTextHandleAtPoint(
  point: Point,
  textElements: TextElement[],
  selectedIds: Set<string>,
  threshold: number
): TextHandleHit | null {
  for (let i = textElements.length - 1; i >= 0; i -= 1) {
    const text = textElements[i]
    if (!text || !text.text || !selectedIds.has(text.id)) continue
    if (distance(point, getTextRotateHandle(text)) <= threshold) {
      return { type: 'rotate', text }
    }
    for (const handle of getTextResizeHandles(text)) {
      if (distance(point, handle.point) <= threshold) {
        return { type: 'resize', handle: handle.handle, text }
      }
    }
  }
  return null
}

export function findTextAtPoint(
  point: Point,
  textElements: TextElement[]
): TextElement | null {
  for (let i = textElements.length - 1; i >= 0; i -= 1) {
    const text = textElements[i]
    if (!text || !text.text) continue
    if (isPointInText(point, text)) {
      return text
    }
  }
  return null
}

export function resizeTextFromHandle(
  text: TextElement,
  handle: TextResizeHandle,
  point: Point
): TextElement {
  const bounds = calculateTextBounds(text)
  const center = getTextCenter(text)
  const localPoint = unrotatePoint(point, center, text.rotation ?? 0)
  let opposite: Point

  switch (handle) {
    case 'nw':
      opposite = { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
      break
    case 'ne':
      opposite = { x: bounds.x, y: bounds.y + bounds.height }
      break
    case 'se':
      opposite = { x: bounds.x, y: bounds.y }
      break
    case 'sw':
      opposite = { x: bounds.x + bounds.width, y: bounds.y }
      break
  }

  const widthRatio =
    Math.max(Math.abs(localPoint.x - opposite.x), 1) / Math.max(bounds.width, 1)
  const heightRatio =
    Math.max(Math.abs(localPoint.y - opposite.y), 1) /
    Math.max(bounds.height, 1)
  const nextFontSize = Math.min(
    MAX_TEXT_FONT_SIZE,
    Math.max(
      MIN_TEXT_FONT_SIZE,
      text.fontSize * Math.max(widthRatio, heightRatio)
    )
  )
  const lines = getTextLines(text.text)
  const nextWidth =
    getTextContentWidth(lines, nextFontSize) + TEXT_BOUNDS_PADDING * 2
  const nextHeight =
    (lines.length - 1) * getTextLineHeight(nextFontSize) +
    nextFontSize +
    TEXT_BOUNDS_PADDING * 2
  let nextBounds: { x: number; y: number; width: number; height: number }

  switch (handle) {
    case 'nw':
      nextBounds = {
        x: opposite.x - nextWidth,
        y: opposite.y - nextHeight,
        width: nextWidth,
        height: nextHeight
      }
      break
    case 'ne':
      nextBounds = {
        x: opposite.x,
        y: opposite.y - nextHeight,
        width: nextWidth,
        height: nextHeight
      }
      break
    case 'se':
      nextBounds = {
        x: opposite.x,
        y: opposite.y,
        width: nextWidth,
        height: nextHeight
      }
      break
    case 'sw':
      nextBounds = {
        x: opposite.x - nextWidth,
        y: opposite.y,
        width: nextWidth,
        height: nextHeight
      }
      break
  }

  const nextLocalCenter = {
    x: nextBounds.x + nextBounds.width / 2,
    y: nextBounds.y + nextBounds.height / 2
  }
  const nextCenter = rotatePoint(nextLocalCenter, center, text.rotation ?? 0)

  return {
    ...text,
    x: nextCenter.x - nextBounds.width / 2 + TEXT_BOUNDS_PADDING,
    y: nextCenter.y - nextBounds.height / 2 + TEXT_BOUNDS_PADDING,
    fontSize: nextFontSize
  }
}

export function rotateTextTowardPoint(
  text: TextElement,
  point: Point
): TextElement {
  const center = getTextCenter(text)
  const degrees =
    (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
  return {
    ...text,
    rotation: degrees + 90
  }
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

export function canvasToScreen(point: Point, camera: Camera): Point {
  return {
    x: camera.x + point.x * camera.scale,
    y: camera.y + point.y * camera.scale
  }
}

export function selectionRectFromPoints(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
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
  const lines = getTextLines(text.text)
  const maxLineWidth = Math.max(
    ...lines.map((line) =>
      measureTextWidth(line || ' ', text.fontSize, text.isBold, text.isItalic)
    )
  )
  const width = maxLineWidth + TEXT_BOUNDS_PADDING * 2
  const height =
    (lines.length - 1) * getTextLineHeight(text.fontSize) +
    text.fontSize +
    TEXT_BOUNDS_PADDING * 2
  return {
    x: text.x - TEXT_BOUNDS_PADDING,
    y: text.y - TEXT_BOUNDS_PADDING,
    width,
    height
  }
}

export function clonePath(path: Path): Path {
  return { ...path, points: path.points.map((p) => ({ ...p })) }
}

export function getPathBoundingBox(
  path: Path,
  padding = 0
): {
  x: number
  y: number
  width: number
  height: number
} {
  if (path.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of path.points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding
  }
}

export function getPathCenter(path: Path): Point {
  const bb = getPathBoundingBox(path)
  return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
}

export function getPathOutlinePoints(path: Path): Point[] {
  const bb = getPathBoundingBox(path, path.width / 2)
  return [
    { x: bb.x, y: bb.y },
    { x: bb.x + bb.width, y: bb.y },
    { x: bb.x + bb.width, y: bb.y + bb.height },
    { x: bb.x, y: bb.y + bb.height }
  ]
}

export function getPathResizeHandles(
  path: Path
): Array<{ handle: PathResizeHandle; point: Point }> {
  const [nw, ne, se, sw] = getPathOutlinePoints(path)
  const bb = getPathBoundingBox(path, path.width / 2)
  return [
    { handle: 'nw', point: nw ?? { x: bb.x, y: bb.y } },
    { handle: 'ne', point: ne ?? { x: bb.x + bb.width, y: bb.y } },
    {
      handle: 'se',
      point: se ?? { x: bb.x + bb.width, y: bb.y + bb.height }
    },
    { handle: 'sw', point: sw ?? { x: bb.x, y: bb.y + bb.height } }
  ]
}

export function getPathRotateAnchor(path: Path): Point {
  const bb = getPathBoundingBox(path, path.width / 2)
  return { x: bb.x + bb.width / 2, y: bb.y }
}

export function getPathRotateHandle(path: Path): Point {
  const anchor = getPathRotateAnchor(path)
  return { x: anchor.x, y: anchor.y - PATH_ROTATE_HANDLE_LENGTH }
}

export function findPathHandleAtPoint(
  point: Point,
  paths: Path[],
  selectedIds: Set<string>,
  threshold: number
): PathHandleHit | null {
  for (let i = paths.length - 1; i >= 0; i -= 1) {
    const path = paths[i]
    if (!path || !selectedIds.has(path.id) || path.points.length === 0) continue
    if (distance(point, getPathRotateHandle(path)) <= threshold) {
      return { type: 'rotate', path }
    }
    for (const handle of getPathResizeHandles(path)) {
      if (distance(point, handle.point) <= threshold) {
        return { type: 'resize', handle: handle.handle, path }
      }
    }
  }
  return null
}

export function resizePathFromHandle(
  original: Path,
  handle: PathResizeHandle,
  point: Point
): Path {
  const bb = getPathBoundingBox(original)
  const minSize = 1
  let fixedX: number
  let fixedY: number
  let newX: number
  let newY: number

  switch (handle) {
    case 'nw':
      fixedX = bb.x + bb.width
      fixedY = bb.y + bb.height
      newX = Math.min(point.x, fixedX - minSize)
      newY = Math.min(point.y, fixedY - minSize)
      break
    case 'ne':
      fixedX = bb.x
      fixedY = bb.y + bb.height
      newX = Math.max(point.x, fixedX + minSize)
      newY = Math.min(point.y, fixedY - minSize)
      break
    case 'se':
      fixedX = bb.x
      fixedY = bb.y
      newX = Math.max(point.x, fixedX + minSize)
      newY = Math.max(point.y, fixedY + minSize)
      break
    case 'sw':
      fixedX = bb.x + bb.width
      fixedY = bb.y
      newX = Math.min(point.x, fixedX - minSize)
      newY = Math.max(point.y, fixedY + minSize)
      break
  }

  const newMinX = Math.min(newX, fixedX)
  const newMaxX = Math.max(newX, fixedX)
  const newMinY = Math.min(newY, fixedY)
  const newMaxY = Math.max(newY, fixedY)
  const newWidth = newMaxX - newMinX
  const newHeight = newMaxY - newMinY

  return {
    ...original,
    points: original.points.map((p) => ({
      x:
        bb.width === 0
          ? newMinX
          : newMinX + ((p.x - bb.x) / bb.width) * newWidth,
      y:
        bb.height === 0
          ? newMinY
          : newMinY + ((p.y - bb.y) / bb.height) * newHeight
    }))
  }
}

export function rotatePathTowardPoint(original: Path, point: Point): Path {
  const center = getPathCenter(original)
  const degrees =
    (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
  const rotation = degrees + 90
  return {
    ...original,
    points: original.points.map((p) => rotatePoint(p, center, rotation))
  }
}
