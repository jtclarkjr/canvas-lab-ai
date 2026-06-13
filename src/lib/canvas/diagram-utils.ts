import type {
  AnchorPosition,
  ConnectorKind,
  DiagramAnchorBinding,
  DiagramAnchorTargetType,
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

export type AnchorTarget = {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number | null
}

export type AnchorHit = {
  endpoint: DiagramEndpoint
  target: AnchorTarget
  targetType: DiagramAnchorTargetType
  shape?: DiagramShape
  anchor: AnchorPosition
}

const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']

export function makeAnchorBinding(
  targetType: DiagramAnchorTargetType,
  targetId: string,
  anchor: AnchorPosition
): DiagramAnchorBinding {
  return {
    targetType,
    targetId,
    anchor,
    ...(targetType === 'shape' ? { shapeId: targetId } : { sceneId: targetId })
  }
}

export function normalizeAnchorBinding(
  binding: DiagramEndpoint['binding'] | null | undefined
): DiagramAnchorBinding | null {
  if (!binding) return null

  const targetType = binding.targetType ?? (binding.sceneId ? 'scene' : 'shape')
  const targetId =
    binding.targetId ??
    (targetType === 'scene' ? binding.sceneId : binding.shapeId) ??
    binding.shapeId ??
    binding.sceneId

  if (!targetId) return null

  return makeAnchorBinding(targetType, targetId, binding.anchor)
}

function targetRotation(target: AnchorTarget) {
  return target.rotation ?? 0
}

export function getAnchorTargetCenter(target: AnchorTarget): Point {
  return {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2
  }
}

export function getAnchorTargetOutlinePoints(target: AnchorTarget): Point[] {
  const center = getAnchorTargetCenter(target)
  return [
    { x: target.x, y: target.y },
    { x: target.x + target.width, y: target.y },
    { x: target.x + target.width, y: target.y + target.height },
    { x: target.x, y: target.y + target.height }
  ].map((point) => rotatePoint(point, center, targetRotation(target)))
}

export function getAnchorTargetPoint(
  target: AnchorTarget,
  anchor: AnchorPosition
): Point {
  const center = getAnchorTargetCenter(target)
  let point: Point
  switch (anchor) {
    case 'top':
      point = { x: center.x, y: target.y }
      break
    case 'right':
      point = { x: target.x + target.width, y: center.y }
      break
    case 'bottom':
      point = { x: center.x, y: target.y + target.height }
      break
    case 'left':
      point = { x: target.x, y: center.y }
      break
  }
  return rotatePoint(point, center, targetRotation(target))
}

export function getAnchorTargetAnchors(
  target: AnchorTarget
): Array<{ anchor: AnchorPosition; point: Point }> {
  return anchors.map((anchor) => ({
    anchor,
    point: getAnchorTargetPoint(target, anchor)
  }))
}

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
    binding: normalizeAnchorBinding(endpoint.binding)
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
    start: cloneEndpoint(connector.start),
    end: cloneEndpoint(connector.end),
    strokeColor: connector.strokeColor,
    strokeWidth: connector.strokeWidth,
    strokeStyle: connector.strokeStyle,
    opacity: connector.opacity,
    startArrow: connector.startArrow,
    endArrow: connector.endArrow,
    text: connector.text ?? '',
    textColor: connector.textColor ?? '#000000',
    textFontSize: connector.textFontSize ?? 16,
    textIsBold: connector.textIsBold ?? false,
    textIsItalic: connector.textIsItalic ?? false,
    textIsUnderline: connector.textIsUnderline ?? false
  }
}

export function getShapeCenter(shape: DiagramShape): Point {
  return getAnchorTargetCenter(shape)
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
  return getAnchorTargetOutlinePoints(shape)
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
  return getAnchorTargetPoint(shape, anchor)
}

export function getShapeAnchors(
  shape: DiagramShape
): Array<{ anchor: AnchorPosition; point: Point }> {
  return getAnchorTargetAnchors(shape)
}

export function resolveEndpoint(
  endpoint: DiagramEndpoint,
  shapes: DiagramShape[],
  scenes: AnchorTarget[] = []
): Point {
  const binding = normalizeAnchorBinding(endpoint.binding)
  if (binding) {
    if (binding.targetType === 'scene') {
      const scene = scenes.find((entry) => entry.id === binding.targetId)
      if (scene) {
        return getAnchorTargetPoint(scene, binding.anchor)
      }
    } else {
      const shape = shapes.find((entry) => entry.id === binding.targetId)
      if (shape) {
        return getShapeAnchorPoint(shape, binding.anchor)
      }
    }
  }
  return { x: endpoint.x, y: endpoint.y }
}

export function getConnectorRoutePoints(
  connector: DiagramConnector,
  shapes: DiagramShape[],
  scenes: AnchorTarget[] = []
): Point[] {
  const start = resolveEndpoint(connector.start, shapes, scenes)
  const end = resolveEndpoint(connector.end, shapes, scenes)
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

export function getConnectorLabelPoint(
  connector: DiagramConnector,
  shapes: DiagramShape[],
  scenes: AnchorTarget[] = []
): Point {
  const points = getConnectorRoutePoints(connector, shapes, scenes)
  if (connector.kind === 'curved') {
    const start = points[0]
    const control = points[1]
    const end = points[2]
    if (start && control && end) {
      return {
        x: (start.x + 2 * control.x + end.x) / 4,
        y: (start.y + 2 * control.y + end.y) / 4
      }
    }
  }

  let totalLength = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    if (start && end) {
      totalLength += distance(start, end)
    }
  }

  const midpointLength = totalLength / 2
  let traversed = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    if (!start || !end) continue
    const segmentLength = distance(start, end)
    if (traversed + segmentLength >= midpointLength) {
      const ratio =
        segmentLength === 0 ? 0 : (midpointLength - traversed) / segmentLength
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      }
    }
    traversed += segmentLength
  }

  return points[0] ?? { x: 0, y: 0 }
}

export function connectorToSvgPath(
  connector: DiagramConnector,
  shapes: DiagramShape[],
  scenes: AnchorTarget[] = []
): string {
  const points = getConnectorRoutePoints(connector, shapes, scenes)
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
  shapes: DiagramShape[],
  scenes: AnchorTarget[] = []
): { start: [Point, Point] | null; end: [Point, Point] | null } {
  const points = getConnectorRoutePoints(connector, shapes, scenes)
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

function pointInRect(point: Point, target: AnchorTarget): boolean {
  return (
    point.x >= target.x &&
    point.x <= target.x + target.width &&
    point.y >= target.y &&
    point.y <= target.y + target.height
  )
}

export function isPointInAnchorTarget(
  point: Point,
  target: AnchorTarget
): boolean {
  const local = unrotatePoint(
    point,
    getAnchorTargetCenter(target),
    targetRotation(target)
  )
  return pointInRect(local, target)
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
  threshold: number,
  scenes: AnchorTarget[] = []
): boolean {
  const route = getConnectorRoutePoints(connector, shapes, scenes)
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
  threshold: number,
  scenes: AnchorTarget[] = []
): DiagramConnector | null {
  for (let i = connectors.length - 1; i >= 0; i -= 1) {
    const connector = connectors[i]
    if (
      connector &&
      isPointNearConnector(point, connector, shapes, threshold, scenes)
    ) {
      return connector
    }
  }
  return null
}

export function getAnchorTargetResizeHandles(
  target: AnchorTarget
): Array<{ handle: ShapeResizeHandle; point: Point }> {
  const [nw, ne, se, sw] = getAnchorTargetOutlinePoints(target)
  return [
    { handle: 'nw', point: nw ?? { x: target.x, y: target.y } },
    {
      handle: 'ne',
      point: ne ?? { x: target.x + target.width, y: target.y }
    },
    {
      handle: 'se',
      point: se ?? { x: target.x + target.width, y: target.y + target.height }
    },
    {
      handle: 'sw',
      point: sw ?? { x: target.x, y: target.y + target.height }
    }
  ]
}

export function getShapeResizeHandles(
  shape: DiagramShape
): Array<{ handle: ShapeResizeHandle; point: Point }> {
  return getAnchorTargetResizeHandles(shape)
}

export function getAnchorTargetRotateHandle(target: AnchorTarget): Point {
  const top = getAnchorTargetPoint(target, 'top')
  const center = getAnchorTargetCenter(target)
  const length = 32
  const dx = top.x - center.x
  const dy = top.y - center.y
  const magnitude = Math.max(Math.hypot(dx, dy), 1)
  return {
    x: top.x + (dx / magnitude) * length,
    y: top.y + (dy / magnitude) * length
  }
}

export function getShapeRotateHandle(shape: DiagramShape): Point {
  return getAnchorTargetRotateHandle(shape)
}

export function findAnchorTargetHandleAtPoint<T extends AnchorTarget>(
  point: Point,
  targets: T[],
  selectedIds: Set<string>,
  threshold: number
):
  | { type: 'resize'; handle: ShapeResizeHandle; target: T }
  | { type: 'rotate'; target: T }
  | null {
  for (let i = targets.length - 1; i >= 0; i -= 1) {
    const target = targets[i]
    if (!target || !selectedIds.has(target.id)) continue
    if (distance(point, getAnchorTargetRotateHandle(target)) <= threshold) {
      return { type: 'rotate', target }
    }
    for (const handle of getAnchorTargetResizeHandles(target)) {
      if (distance(point, handle.point) <= threshold) {
        return { type: 'resize', handle: handle.handle, target }
      }
    }
  }
  return null
}

export function findShapeHandleAtPoint(
  point: Point,
  shapes: DiagramShape[],
  selectedIds: Set<string>,
  threshold: number
): ShapeHandleHit | null {
  const hit = findAnchorTargetHandleAtPoint(
    point,
    shapes,
    selectedIds,
    threshold
  )
  if (!hit) return null
  if (hit.type === 'rotate') {
    return { type: 'rotate', shape: hit.target }
  }
  return { type: 'resize', handle: hit.handle, shape: hit.target }
}

export function findConnectorEndpointAtPoint(
  point: Point,
  connectors: DiagramConnector[],
  shapes: DiagramShape[],
  selectedIds: Set<string>,
  threshold: number,
  scenes: AnchorTarget[] = []
): { connector: DiagramConnector; end: 'start' | 'end' } | null {
  for (let i = connectors.length - 1; i >= 0; i -= 1) {
    const connector = connectors[i]
    if (!connector || !selectedIds.has(connector.id)) continue
    if (
      distance(point, resolveEndpoint(connector.start, shapes, scenes)) <=
      threshold
    ) {
      return { connector, end: 'start' }
    }
    if (
      distance(point, resolveEndpoint(connector.end, shapes, scenes)) <=
      threshold
    ) {
      return { connector, end: 'end' }
    }
  }
  return null
}

export function findNearestShapeAnchor(
  point: Point,
  shapes: DiagramShape[],
  threshold: number,
  scenes: AnchorTarget[] = []
): AnchorHit | null {
  let best: AnchorHit | null = null
  let bestDistance = Infinity

  const visitTarget = (
    target: AnchorTarget,
    targetType: DiagramAnchorTargetType,
    isInside: boolean,
    shape?: DiagramShape
  ) => {
    for (const entry of getAnchorTargetAnchors(target)) {
      const anchorDistance = distance(point, entry.point)
      const insideBonus = isInside ? threshold : 0
      if (
        anchorDistance <= threshold + insideBonus &&
        anchorDistance < bestDistance
      ) {
        bestDistance = anchorDistance
        best = {
          target,
          targetType,
          shape,
          anchor: entry.anchor,
          endpoint: {
            x: entry.point.x,
            y: entry.point.y,
            binding: makeAnchorBinding(targetType, target.id, entry.anchor)
          }
        }
      }
    }
  }

  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i]
    if (!shape) continue
    visitTarget(shape, 'shape', isPointInShape(point, shape), shape)
  }

  for (let i = scenes.length - 1; i >= 0; i -= 1) {
    const scene = scenes[i]
    if (!scene) continue
    visitTarget(scene, 'scene', isPointInAnchorTarget(point, scene))
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
  return resizeAnchorTargetFromHandle(shape, handle, point, {
    minWidth: MIN_SHAPE_SIZE,
    minHeight: MIN_SHAPE_SIZE
  })
}

export function resizeAnchorTargetFromHandle<T extends AnchorTarget>(
  target: T,
  handle: ShapeResizeHandle,
  point: Point,
  options: {
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
  } = {}
): T {
  const center = getAnchorTargetCenter(target)
  const localPoint = unrotatePoint(point, center, targetRotation(target))
  let opposite: Point
  switch (handle) {
    case 'nw':
      opposite = { x: target.x + target.width, y: target.y + target.height }
      break
    case 'ne':
      opposite = { x: target.x, y: target.y + target.height }
      break
    case 'se':
      opposite = { x: target.x, y: target.y }
      break
    case 'sw':
      opposite = { x: target.x + target.width, y: target.y }
      break
  }

  const nextX = Math.min(localPoint.x, opposite.x)
  const nextY = Math.min(localPoint.y, opposite.y)
  const minWidth = options.minWidth ?? MIN_SHAPE_SIZE
  const minHeight = options.minHeight ?? MIN_SHAPE_SIZE
  const maxWidth = options.maxWidth ?? Infinity
  const maxHeight = options.maxHeight ?? Infinity
  return {
    ...target,
    x: nextX,
    y: nextY,
    width: Math.min(
      Math.max(Math.abs(localPoint.x - opposite.x), minWidth),
      maxWidth
    ),
    height: Math.min(
      Math.max(Math.abs(localPoint.y - opposite.y), minHeight),
      maxHeight
    )
  }
}

export function rotateShapeTowardPoint(
  shape: DiagramShape,
  point: Point
): DiagramShape {
  return rotateAnchorTargetTowardPoint(shape, point)
}

export function rotateAnchorTargetTowardPoint<T extends AnchorTarget>(
  target: T,
  point: Point
): T {
  const center = getAnchorTargetCenter(target)
  const degrees =
    (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
  return {
    ...target,
    rotation: degrees + 90
  }
}

export function isDiagramElementInSelection(
  element: DiagramShape | DiagramConnector,
  shapes: DiagramShape[],
  selectionRect: { x1: number; y1: number; x2: number; y2: number },
  scenes: AnchorTarget[] = []
): boolean {
  const points =
    'kind' in element && 'width' in element
      ? getShapeOutlinePoints(element)
      : getConnectorRoutePoints(element, shapes, scenes)
  return points.some((point) => isPointInSelection(point, selectionRect))
}

function isPointInSelection(
  point: Point,
  selectionRect: { x1: number; y1: number; x2: number; y2: number }
) {
  return (
    point.x >= selectionRect.x1 &&
    point.x <= selectionRect.x2 &&
    point.y >= selectionRect.y1 &&
    point.y <= selectionRect.y2
  )
}

export function isAnchorTargetInSelection(
  target: AnchorTarget,
  selectionRect: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  return getAnchorTargetOutlinePoints(target).some((point) =>
    isPointInSelection(point, selectionRect)
  )
}

export function hasConnectorBindingToTarget(
  connector: DiagramConnector,
  targetType: DiagramAnchorTargetType,
  targetId: string
): boolean {
  const startBinding = normalizeAnchorBinding(connector.start.binding)
  const endBinding = normalizeAnchorBinding(connector.end.binding)
  return (
    (startBinding?.targetType === targetType &&
      startBinding.targetId === targetId) ||
    (endBinding?.targetType === targetType && endBinding.targetId === targetId)
  )
}

export function hasConnectorBindingToShape(
  connector: DiagramConnector,
  shapeId: string
): boolean {
  return hasConnectorBindingToTarget(connector, 'shape', shapeId)
}
