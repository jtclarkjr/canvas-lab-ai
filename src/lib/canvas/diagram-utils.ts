import type {
  AnchorPosition,
  ConnectorKind,
  DiagramConnector,
  DiagramEndpoint,
  DiagramFormatting,
  DiagramShape,
  Point,
  ShapeKind,
  StrokeStyle
} from '$lib/canvas/types'

export const DEFAULT_SHAPE_WIDTH = 160
export const DEFAULT_SHAPE_HEIGHT = 96
export const MIN_SHAPE_SIZE = 24

export type ShapeResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

export type ShapeHandleHit =
  | { type: 'resize'; handle: ShapeResizeHandle; shape: DiagramShape }
  | { type: 'rotate'; shape: DiagramShape }

export type AnchorHit = {
  endpoint: DiagramEndpoint
  shape: DiagramShape
  anchor: AnchorPosition
}

const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']

export function getShapeResizeCursor(
  handle: ShapeResizeHandle,
  rotation: number
): string {
  let baseAngle = 45
  switch (handle) {
    case 'ne':
    case 'sw':
      baseAngle = 135
      break
    case 'nw':
    case 'se':
      baseAngle = 45
      break
  }

  const normalizedAngle = (((baseAngle + rotation) % 180) + 180) % 180
  const direction = Math.round(normalizedAngle / 45) % 4

  switch (direction) {
    case 0:
      return 'ew-resize'
    case 1:
      return 'nwse-resize'
    case 2:
      return 'ns-resize'
    case 3:
      return 'nesw-resize'
  }

  return 'nwse-resize'
}

export function cloneEndpoint(endpoint: DiagramEndpoint): DiagramEndpoint {
  return {
    x: endpoint.x,
    y: endpoint.y,
    binding: endpoint.binding ? { ...endpoint.binding } : null
  }
}

export function cloneShape(shape: DiagramShape): DiagramShape {
  return { ...shape }
}

export function cloneConnector(connector: DiagramConnector): DiagramConnector {
  return {
    ...connector,
    start: cloneEndpoint(connector.start),
    end: cloneEndpoint(connector.end)
  }
}

export function normalizeStrokeStyle(style: unknown): StrokeStyle {
  return style === 'dashed' || style === 'dotted' ? style : 'solid'
}

export function normalizeShapeKind(kind: unknown): ShapeKind {
  return kind === 'diamond' || kind === 'ellipse' ? kind : 'rectangle'
}

export function normalizeConnectorKind(kind: unknown): ConnectorKind {
  return kind === 'elbow' || kind === 'curved' ? kind : 'straight'
}

export function getStrokeDashArray(
  style: StrokeStyle,
  strokeWidth: number
): string | undefined {
  if (style === 'dashed') {
    return `${Math.max(8, strokeWidth * 4)} ${Math.max(6, strokeWidth * 3)}`
  }
  if (style === 'dotted') {
    return `${Math.max(1, strokeWidth)} ${Math.max(5, strokeWidth * 3)}`
  }
  return undefined
}

export function shapeToData(shape: DiagramShape): Record<string, unknown> {
  return {
    kind: shape.kind,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation,
    fillColor: shape.fillColor,
    strokeColor: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
    strokeStyle: shape.strokeStyle,
    opacity: shape.opacity,
    text: shape.text ?? '',
    textColor: shape.textColor ?? '#000000',
    textFontSize: shape.textFontSize ?? 16,
    textIsBold: shape.textIsBold ?? false,
    textIsItalic: shape.textIsItalic ?? false,
    textIsUnderline: shape.textIsUnderline ?? false
  }
}

export function connectorToData(
  connector: DiagramConnector
): Record<string, unknown> {
  return {
    kind: connector.kind,
    start: connector.start,
    end: connector.end,
    strokeColor: connector.strokeColor,
    strokeWidth: connector.strokeWidth,
    strokeStyle: connector.strokeStyle,
    opacity: connector.opacity,
    startArrow: connector.startArrow,
    endArrow: connector.endArrow
  }
}

export function getShapeCenter(shape: DiagramShape): Point {
  return {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  }
}

export function rotatePoint(
  point: Point,
  center: Point,
  degrees: number
): Point {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

export function unrotatePoint(
  point: Point,
  center: Point,
  degrees: number
): Point {
  return rotatePoint(point, center, -degrees)
}

export function getShapeOutlinePoints(shape: DiagramShape): Point[] {
  const center = getShapeCenter(shape)
  return [
    { x: shape.x, y: shape.y },
    { x: shape.x + shape.width, y: shape.y },
    { x: shape.x + shape.width, y: shape.y + shape.height },
    { x: shape.x, y: shape.y + shape.height }
  ].map((point) => rotatePoint(point, center, shape.rotation))
}

export function getDiamondPoints(shape: DiagramShape): Point[] {
  const center = getShapeCenter(shape)
  return [
    { x: center.x, y: shape.y },
    { x: shape.x + shape.width, y: center.y },
    { x: center.x, y: shape.y + shape.height },
    { x: shape.x, y: center.y }
  ].map((point) => rotatePoint(point, center, shape.rotation))
}

export function pointsToSvg(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function getShapeAnchorPoint(
  shape: DiagramShape,
  anchor: AnchorPosition
): Point {
  const center = getShapeCenter(shape)
  let point: Point
  switch (anchor) {
    case 'top':
      point = { x: center.x, y: shape.y }
      break
    case 'right':
      point = { x: shape.x + shape.width, y: center.y }
      break
    case 'bottom':
      point = { x: center.x, y: shape.y + shape.height }
      break
    case 'left':
      point = { x: shape.x, y: center.y }
      break
  }
  return rotatePoint(point, center, shape.rotation)
}

export function getShapeAnchors(
  shape: DiagramShape
): Array<{ anchor: AnchorPosition; point: Point }> {
  return anchors.map((anchor) => ({
    anchor,
    point: getShapeAnchorPoint(shape, anchor)
  }))
}

export function resolveEndpoint(
  endpoint: DiagramEndpoint,
  shapes: DiagramShape[]
): Point {
  if (endpoint.binding) {
    const shape = shapes.find((entry) => entry.id === endpoint.binding?.shapeId)
    if (shape) {
      return getShapeAnchorPoint(shape, endpoint.binding.anchor)
    }
  }
  return { x: endpoint.x, y: endpoint.y }
}

export function getConnectorRoutePoints(
  connector: DiagramConnector,
  shapes: DiagramShape[]
): Point[] {
  const start = resolveEndpoint(connector.start, shapes)
  const end = resolveEndpoint(connector.end, shapes)
  if (connector.kind === 'elbow') {
    const midX = start.x + (end.x - start.x) / 2
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
  }
  if (connector.kind === 'curved') {
    const dx = end.x - start.x
    const dy = end.y - start.y
    return [
      start,
      {
        x: start.x + dx / 2 - dy * 0.2,
        y: start.y + dy / 2 + dx * 0.2
      },
      end
    ]
  }
  return [start, end]
}

export function connectorToSvgPath(
  connector: DiagramConnector,
  shapes: DiagramShape[]
): string {
  const points = getConnectorRoutePoints(connector, shapes)
  const first = points[0]
  if (!first) return ''
  if (connector.kind === 'curved') {
    const control = points[1]
    const end = points[2]
    return control && end
      ? `M ${first.x} ${first.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
      : ''
  }
  return points
    .slice(1)
    .reduce(
      (path, point) => `${path} L ${point.x} ${point.y}`,
      `M ${first.x} ${first.y}`
    )
}

export function getConnectorTerminalSegments(
  connector: DiagramConnector,
  shapes: DiagramShape[]
): { start: [Point, Point] | null; end: [Point, Point] | null } {
  const points = getConnectorRoutePoints(connector, shapes)
  if (points.length < 2) {
    return { start: null, end: null }
  }
  const first = points[0]
  const second = points[1]
  const last = points[points.length - 1]
  const beforeLast = points[points.length - 2]
  if (!first || !second || !last || !beforeLast) {
    return { start: null, end: null }
  }
  return {
    start: [second, first],
    end: [beforeLast, last]
  }
}

export function getArrowheadPoints(
  tail: Point,
  tip: Point,
  size: number
): Point[] {
  const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x)
  const wing = Math.PI / 7
  return [
    tip,
    {
      x: tip.x - size * Math.cos(angle - wing),
      y: tip.y - size * Math.sin(angle - wing)
    },
    {
      x: tip.x - size * Math.cos(angle + wing),
      y: tip.y - size * Math.sin(angle + wing)
    }
  ]
}

function distance(pointA: Point, pointB: Point): number {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y)
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return distance(point, start)
  }
  const t = Math.min(
    Math.max(
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
      0
    ),
    1
  )
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy })
}

function pointInRect(point: Point, shape: DiagramShape): boolean {
  return (
    point.x >= shape.x &&
    point.x <= shape.x + shape.width &&
    point.y >= shape.y &&
    point.y <= shape.y + shape.height
  )
}

export function isPointInShape(point: Point, shape: DiagramShape): boolean {
  const local = unrotatePoint(point, getShapeCenter(shape), shape.rotation)
  const center = getShapeCenter(shape)

  if (shape.kind === 'ellipse') {
    const rx = shape.width / 2
    const ry = shape.height / 2
    if (rx === 0 || ry === 0) return false
    return (
      ((local.x - center.x) / rx) ** 2 + ((local.y - center.y) / ry) ** 2 <= 1
    )
  }

  if (shape.kind === 'diamond') {
    const halfWidth = shape.width / 2
    const halfHeight = shape.height / 2
    if (halfWidth === 0 || halfHeight === 0) return false
    return (
      Math.abs(local.x - center.x) / halfWidth +
        Math.abs(local.y - center.y) / halfHeight <=
      1
    )
  }

  return pointInRect(local, shape)
}

export function findShapeAtPoint(
  point: Point,
  shapes: DiagramShape[]
): DiagramShape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i]
    if (shape && isPointInShape(point, shape)) {
      return shape
    }
  }
  return null
}

export function isPointNearConnector(
  point: Point,
  connector: DiagramConnector,
  shapes: DiagramShape[],
  threshold: number
): boolean {
  const route = getConnectorRoutePoints(connector, shapes)
  if (route.length < 2) return false

  if (connector.kind === 'curved' && route.length === 3) {
    const start = route[0]
    const control = route[1]
    const end = route[2]
    if (!start || !control || !end) return false
    let previous = start
    for (let index = 1; index <= 18; index += 1) {
      const t = index / 18
      const current = {
        x:
          (1 - t) * (1 - t) * start.x +
          2 * (1 - t) * t * control.x +
          t * t * end.x,
        y:
          (1 - t) * (1 - t) * start.y +
          2 * (1 - t) * t * control.y +
          t * t * end.y
      }
      if (distanceToSegment(point, previous, current) <= threshold) {
        return true
      }
      previous = current
    }
    return false
  }

  for (let index = 0; index < route.length - 1; index += 1) {
    const start = route[index]
    const end = route[index + 1]
    if (start && end && distanceToSegment(point, start, end) <= threshold) {
      return true
    }
  }
  return false
}

export function findConnectorAtPoint(
  point: Point,
  connectors: DiagramConnector[],
  shapes: DiagramShape[],
  threshold: number
): DiagramConnector | null {
  for (let i = connectors.length - 1; i >= 0; i -= 1) {
    const connector = connectors[i]
    if (
      connector &&
      isPointNearConnector(point, connector, shapes, threshold)
    ) {
      return connector
    }
  }
  return null
}

export function getShapeResizeHandles(
  shape: DiagramShape
): Array<{ handle: ShapeResizeHandle; point: Point }> {
  const [nw, ne, se, sw] = getShapeOutlinePoints(shape)
  return [
    { handle: 'nw', point: nw ?? { x: shape.x, y: shape.y } },
    { handle: 'ne', point: ne ?? { x: shape.x + shape.width, y: shape.y } },
    {
      handle: 'se',
      point: se ?? { x: shape.x + shape.width, y: shape.y + shape.height }
    },
    { handle: 'sw', point: sw ?? { x: shape.x, y: shape.y + shape.height } }
  ]
}

export function getShapeRotateHandle(shape: DiagramShape): Point {
  const top = getShapeAnchorPoint(shape, 'top')
  const center = getShapeCenter(shape)
  const length = 32
  const dx = top.x - center.x
  const dy = top.y - center.y
  const magnitude = Math.max(Math.hypot(dx, dy), 1)
  return {
    x: top.x + (dx / magnitude) * length,
    y: top.y + (dy / magnitude) * length
  }
}

export function findShapeHandleAtPoint(
  point: Point,
  shapes: DiagramShape[],
  selectedIds: Set<string>,
  threshold: number
): ShapeHandleHit | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i]
    if (!shape || !selectedIds.has(shape.id)) continue
    if (distance(point, getShapeRotateHandle(shape)) <= threshold) {
      return { type: 'rotate', shape }
    }
    for (const handle of getShapeResizeHandles(shape)) {
      if (distance(point, handle.point) <= threshold) {
        return { type: 'resize', handle: handle.handle, shape }
      }
    }
  }
  return null
}

export function findConnectorEndpointAtPoint(
  point: Point,
  connectors: DiagramConnector[],
  shapes: DiagramShape[],
  selectedIds: Set<string>,
  threshold: number
): { connector: DiagramConnector; end: 'start' | 'end' } | null {
  for (let i = connectors.length - 1; i >= 0; i -= 1) {
    const connector = connectors[i]
    if (!connector || !selectedIds.has(connector.id)) continue
    if (
      distance(point, resolveEndpoint(connector.start, shapes)) <= threshold
    ) {
      return { connector, end: 'start' }
    }
    if (distance(point, resolveEndpoint(connector.end, shapes)) <= threshold) {
      return { connector, end: 'end' }
    }
  }
  return null
}

export function findNearestShapeAnchor(
  point: Point,
  shapes: DiagramShape[],
  threshold: number
): AnchorHit | null {
  let best: AnchorHit | null = null
  let bestDistance = Infinity

  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i]
    if (!shape) continue
    for (const entry of getShapeAnchors(shape)) {
      const anchorDistance = distance(point, entry.point)
      const insideBonus = isPointInShape(point, shape) ? threshold : 0
      if (
        anchorDistance <= threshold + insideBonus &&
        anchorDistance < bestDistance
      ) {
        bestDistance = anchorDistance
        best = {
          shape,
          anchor: entry.anchor,
          endpoint: {
            x: entry.point.x,
            y: entry.point.y,
            binding: { shapeId: shape.id, anchor: entry.anchor }
          }
        }
      }
    }
  }

  return best
}

export function makeShapeFromBounds(
  id: string,
  start: Point,
  end: Point,
  formatting: DiagramFormatting,
  z: number
): DiagramShape {
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  const isClick = width < 4 && height < 4
  return {
    id,
    kind: formatting.shapeKind,
    x: isClick ? start.x : Math.min(start.x, end.x),
    y: isClick ? start.y : Math.min(start.y, end.y),
    width: isClick ? DEFAULT_SHAPE_WIDTH : Math.max(width, MIN_SHAPE_SIZE),
    height: isClick ? DEFAULT_SHAPE_HEIGHT : Math.max(height, MIN_SHAPE_SIZE),
    rotation: 0,
    fillColor: formatting.fillColor,
    strokeColor: formatting.strokeColor,
    strokeWidth: formatting.strokeWidth,
    strokeStyle: formatting.strokeStyle,
    opacity: formatting.opacity,
    z
  }
}

export function makeConnector(
  id: string,
  start: DiagramEndpoint,
  end: DiagramEndpoint,
  formatting: DiagramFormatting,
  z: number
): DiagramConnector {
  return {
    id,
    kind: formatting.connectorKind,
    start: cloneEndpoint(start),
    end: cloneEndpoint(end),
    strokeColor: formatting.strokeColor,
    strokeWidth: formatting.strokeWidth,
    strokeStyle: formatting.strokeStyle,
    opacity: formatting.opacity,
    startArrow: formatting.startArrow,
    endArrow: formatting.endArrow,
    z
  }
}

export function resizeShapeFromHandle(
  shape: DiagramShape,
  handle: ShapeResizeHandle,
  point: Point
): DiagramShape {
  const center = getShapeCenter(shape)
  const localPoint = unrotatePoint(point, center, shape.rotation)
  let opposite: Point
  switch (handle) {
    case 'nw':
      opposite = { x: shape.x + shape.width, y: shape.y + shape.height }
      break
    case 'ne':
      opposite = { x: shape.x, y: shape.y + shape.height }
      break
    case 'se':
      opposite = { x: shape.x, y: shape.y }
      break
    case 'sw':
      opposite = { x: shape.x + shape.width, y: shape.y }
      break
  }

  const nextX = Math.min(localPoint.x, opposite.x)
  const nextY = Math.min(localPoint.y, opposite.y)
  return {
    ...shape,
    x: nextX,
    y: nextY,
    width: Math.max(Math.abs(localPoint.x - opposite.x), MIN_SHAPE_SIZE),
    height: Math.max(Math.abs(localPoint.y - opposite.y), MIN_SHAPE_SIZE)
  }
}

export function rotateShapeTowardPoint(
  shape: DiagramShape,
  point: Point
): DiagramShape {
  const center = getShapeCenter(shape)
  const degrees =
    (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
  return {
    ...shape,
    rotation: degrees + 90
  }
}

export function isDiagramElementInSelection(
  element: DiagramShape | DiagramConnector,
  shapes: DiagramShape[],
  selectionRect: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  const points =
    'kind' in element && 'width' in element
      ? getShapeOutlinePoints(element)
      : getConnectorRoutePoints(element, shapes)
  return points.some(
    (point) =>
      point.x >= selectionRect.x1 &&
      point.x <= selectionRect.x2 &&
      point.y >= selectionRect.y1 &&
      point.y <= selectionRect.y2
  )
}

export function hasConnectorBindingToShape(
  connector: DiagramConnector,
  shapeId: string
): boolean {
  return (
    connector.start.binding?.shapeId === shapeId ||
    connector.end.binding?.shapeId === shapeId
  )
}
