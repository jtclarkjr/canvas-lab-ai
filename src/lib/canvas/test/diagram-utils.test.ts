import { describe, expect, it } from 'vite-plus/test'
import {
  connectorToSvgPath,
  findNearestShapeAnchor,
  getShapeAnchorPoint,
  getShapeResizeCursor,
  isPointInShape,
  makeConnector,
  makeShapeFromBounds,
  resizeShapeFromHandle,
  rotateShapeTowardPoint
} from '$lib/canvas/diagram-utils'
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
