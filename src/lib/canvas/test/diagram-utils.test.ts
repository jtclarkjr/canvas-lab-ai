import { describe, expect, it } from 'vite-plus/test'
import {
  connectorToSvgPath,
  findNearestShapeAnchor,
  getConnectorLabelPoint,
  getShapeAnchorPoint,
  getShapeResizeCursor,
  isPointInShape,
  makeConnector,
  makeShapeFromBounds,
  resizeShapeFromHandle,
  rotateShapeTowardPoint
} from '$lib/canvas/diagram-utils'
import type { Scene } from '$lib/scenes/schema'
import type { DiagramFormatting, DiagramShape } from '$lib/canvas/types'

const formatting: DiagramFormatting = {
  shapeKind: 'rectangle',
  connectorKind: 'straight',
  fillColor: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 2,
  strokeStyle: 'solid',
  opacity: 1,
  startArrow: 'none',
  endArrow: 'arrow'
}

function makeShape(overrides: Partial<DiagramShape> = {}): DiagramShape {
  return {
    id: 'shape-1',
    kind: 'rectangle',
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    rotation: 0,
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    strokeStyle: 'solid',
    opacity: 1,
    z: 1,
    ...overrides
  }
}

describe('diagram utils', () => {
  it('creates a default-size shape for click creation', () => {
    const shape = makeShapeFromBounds(
      'shape-1',
      { x: 40, y: 50 },
      { x: 41, y: 51 },
      formatting,
      10
    )

    expect(shape.width).toBe(160)
    expect(shape.height).toBe(96)
    expect(shape.x).toBe(40)
    expect(shape.z).toBe(10)
  })

  it('hit-tests rotated and non-rectangular shapes', () => {
    expect(
      isPointInShape({ x: 60, y: 50 }, makeShape({ kind: 'ellipse' }))
    ).toBe(true)
    expect(
      isPointInShape({ x: 10, y: 20 }, makeShape({ kind: 'ellipse' }))
    ).toBe(false)
    expect(
      isPointInShape({ x: 60, y: 50 }, makeShape({ kind: 'diamond' }))
    ).toBe(true)
    expect(isPointInShape({ x: 60, y: 50 }, makeShape({ rotation: 45 }))).toBe(
      true
    )
  })

  it('snaps endpoints to shape anchors and resolves sticky connector paths', () => {
    const shape = makeShape()
    const anchor = findNearestShapeAnchor({ x: 110, y: 50 }, [shape], 12)

    expect(anchor?.anchor).toBe('right')

    const connector = makeConnector(
      'connector-1',
      anchor?.endpoint ?? { x: 0, y: 0, binding: null },
      { x: 220, y: 50, binding: null },
      formatting,
      2
    )

    expect(connectorToSvgPath(connector, [shape])).toBe('M 110 50 L 220 50')
    expect(connectorToSvgPath(connector, [{ ...shape, x: 30, y: 20 }])).toBe(
      'M 130 50 L 220 50'
    )
  })

  it('places connector labels at the route midpoint', () => {
    const straight = makeConnector(
      'connector-1',
      { x: 0, y: 0, binding: null },
      { x: 200, y: 0, binding: null },
      formatting,
      2
    )
    const elbow = {
      ...straight,
      kind: 'elbow' as const,
      end: { x: 100, y: 100 }
    }

    expect(getConnectorLabelPoint(straight, [])).toEqual({ x: 100, y: 0 })
    expect(getConnectorLabelPoint(elbow, [])).toEqual({ x: 50, y: 50 })
  })

  it('snaps endpoints to scene anchors and resolves sticky connector paths', () => {
    const scene: Scene = {
      id: 'scene-1',
      canvasId: 'canvas-1',
      type: 'document',
      title: 'Scene',
      x: 20,
      y: 30,
      width: 200,
      height: 120,
      rotation: 0,
      settings: {},
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
    const anchor = findNearestShapeAnchor({ x: 220, y: 90 }, [], 12, [scene])

    expect(anchor?.targetType).toBe('scene')
    expect(anchor?.endpoint.binding).toMatchObject({
      targetType: 'scene',
      targetId: 'scene-1',
      anchor: 'right'
    })

    const connector = makeConnector(
      'connector-1',
      anchor?.endpoint ?? { x: 0, y: 0, binding: null },
      { x: 300, y: 90, binding: null },
      formatting,
      2
    )

    expect(connectorToSvgPath(connector, [], [scene])).toBe('M 220 90 L 300 90')
    expect(connectorToSvgPath(connector, [], [{ ...scene, x: 40 }])).toBe(
      'M 240 90 L 300 90'
    )
  })

  it('resizes and rotates shapes from handles', () => {
    const shape = makeShape()
    const resized = resizeShapeFromHandle(shape, 'se', { x: 160, y: 110 })
    const rotated = rotateShapeTowardPoint(shape, { x: 60, y: 0 })

    expect(resized.width).toBe(150)
    expect(resized.height).toBe(90)
    expect(Math.round(rotated.rotation)).toBe(0)
    expect(getShapeAnchorPoint(rotated, 'top').y).toBe(20)
  })

  it('maps resize handles to angle-aware cursor styles', () => {
    expect(getShapeResizeCursor('nw', 0)).toBe('nwse-resize')
    expect(getShapeResizeCursor('ne', 0)).toBe('nesw-resize')
    expect(getShapeResizeCursor('nw', 45)).toBe('ns-resize')
    expect(getShapeResizeCursor('ne', 45)).toBe('ew-resize')
    expect(getShapeResizeCursor('nw', -45)).toBe('ew-resize')
  })
})
