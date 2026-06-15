import { describe, expect, it } from 'vite-plus/test'
import {
  connectorToSvgPath,
  getConnectorRoutePoints
} from '$lib/canvas/diagram-utils'
import { buildDiagramTemplate } from '$lib/canvas/temple'
import { diagramTemplates } from '$lib/canvas/temple/consts'
import type { DiagramTemplateId } from '$lib/canvas/temple/types'
import type { DiagramFormatting } from '$lib/canvas/types'

const formatting: DiagramFormatting = {
  shapeKind: 'rectangle',
  connectorKind: 'straight',
  fillColor: '#fef08a',
  strokeColor: '#2563eb',
  strokeWidth: 4,
  strokeStyle: 'dashed',
  opacity: 0.8,
  startArrow: 'none',
  endArrow: 'arrow'
}

const templateIds: DiagramTemplateId[] = [
  'basic-flow',
  'decision-branch',
  'approval-loop',
  'swimlane-activity'
]

function idFactory() {
  let next = 0
  return () => {
    next += 1
    return `id-${next}`
  }
}

describe('diagram templates', () => {
  it('defines the expected UML flow pack', () => {
    expect(diagramTemplates.map((template) => template.id)).toEqual([
      'basic-flow',
      'decision-branch',
      'approval-loop',
      'swimlane-activity'
    ])
  })

  it('builds a centered basic flow with bound connectors', () => {
    const template = buildDiagramTemplate('basic-flow', {
      center: { x: 500, y: 300 },
      formatting,
      createId: idFactory(),
      zStart: 1000
    })

    expect(template.width).toBe(918)
    expect(template.height).toBe(96)
    expect(template.shapes.map((shape) => shape.text)).toEqual([
      'Start',
      'Action',
      'Next action',
      'End'
    ])
    expect(template.shapes[0]).toMatchObject({
      id: 'id-1',
      kind: 'ellipse',
      x: 41,
      y: 268,
      fillColor: '#fef08a',
      strokeColor: '#2563eb',
      strokeWidth: 4,
      strokeStyle: 'dashed',
      opacity: 0.8,
      z: 1000
    })
    expect(template.connectors[0]).toMatchObject({
      id: 'id-5',
      text: 'next',
      start: {
        binding: {
          targetType: 'shape',
          targetId: 'id-1',
          anchor: 'right'
        }
      },
      end: {
        binding: {
          targetType: 'shape',
          targetId: 'id-2',
          anchor: 'left'
        }
      }
    })
    expect(connectorToSvgPath(template.connectors[0]!, template.shapes)).toBe(
      'M 169 300 L 291 300'
    )
    expect(template.elements.map((entry) => entry.type)).toEqual([
      'shape',
      'shape',
      'shape',
      'shape',
      'connector',
      'connector',
      'connector'
    ])
  })

  it('builds every template with placeholder labels and shape bindings', () => {
    for (const templateId of templateIds) {
      const template = buildDiagramTemplate(templateId, {
        center: { x: 0, y: 0 },
        formatting,
        createId: idFactory(),
        zStart: 10
      })
      const shapeIds = new Set(template.shapes.map((shape) => shape.id))

      expect(template.shapes.length).toBeGreaterThan(0)
      expect(template.connectors.length).toBeGreaterThan(0)
      for (const shape of template.shapes) {
        expect(shape.text).toBeTruthy()
      }
      for (const connector of template.connectors) {
        expect(connector.text).toBeTruthy()
        expect(connector.start.binding?.targetType).toBe('shape')
        expect(connector.end.binding?.targetType).toBe('shape')
        expect(shapeIds.has(connector.start.binding?.targetId ?? '')).toBe(true)
        expect(shapeIds.has(connector.end.binding?.targetId ?? '')).toBe(true)
      }
    }
  })

  it('leaves room around template arrow terminals', () => {
    for (const templateId of templateIds) {
      const template = buildDiagramTemplate(templateId, {
        center: { x: 0, y: 0 },
        formatting,
        createId: idFactory(),
        zStart: 10
      })

      for (const connector of template.connectors) {
        const points = getConnectorRoutePoints(connector, template.shapes)
        const first = points[0]
        const second = points[1]
        const beforeLast = points[points.length - 2]
        const last = points[points.length - 1]

        expect(
          first && second ? distance(first, second) : 0
        ).toBeGreaterThanOrEqual(48)
        expect(
          beforeLast && last ? distance(beforeLast, last) : 0
        ).toBeGreaterThanOrEqual(48)
      }
    }
  })
})

function distance(
  first: { x: number; y: number },
  second: { x: number; y: number }
) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}
