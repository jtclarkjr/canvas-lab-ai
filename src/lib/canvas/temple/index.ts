import { makeAnchorBinding } from '$lib/canvas/diagram-utils'
import { diagramTemplateSpecs } from './consts'
import type {
  AnchorPosition,
  DiagramConnector,
  DiagramShape,
  Point
} from '$lib/canvas/types'
import type {
  BuildDiagramTemplateOptions,
  BuiltDiagramTemplate,
  DiagramTemplateId
} from './types'

export function buildDiagramTemplate(
  templateId: DiagramTemplateId,
  options: BuildDiagramTemplateOptions
): BuiltDiagramTemplate {
  const spec = diagramTemplateSpecs[templateId]
  const createId = options.createId ?? crypto.randomUUID.bind(crypto)
  const left = options.center.x - spec.width / 2
  const top = options.center.y - spec.height / 2
  const zStart = options.zStart ?? Date.now()
  const idByKey = new Map<string, string>()

  const shapes = spec.shapes.map((entry, index): DiagramShape => {
    const id = createId()
    idByKey.set(entry.key, id)
    return {
      id,
      kind: entry.kind,
      x: left + entry.x,
      y: top + entry.y,
      width: entry.width,
      height: entry.height,
      rotation: 0,
      fillColor: options.formatting.fillColor,
      strokeColor: options.formatting.strokeColor,
      strokeWidth: options.formatting.strokeWidth,
      strokeStyle: options.formatting.strokeStyle,
      opacity: options.formatting.opacity,
      text: entry.text,
      textColor: '#000000',
      textFontSize: entry.textFontSize ?? 16,
      textIsBold: entry.textIsBold ?? false,
      textIsItalic: false,
      textIsUnderline: false,
      z: zStart + index
    }
  })

  const shapeByKey = new Map(
    spec.shapes.map((entry, index) => [entry.key, shapes[index]])
  )

  const connectors = spec.connectors.map((entry, index): DiagramConnector => {
    const startShape = shapeByKey.get(entry.from)
    const endShape = shapeByKey.get(entry.to)
    const startId = idByKey.get(entry.from)
    const endId = idByKey.get(entry.to)

    if (!startShape || !endShape || !startId || !endId) {
      throw new Error(`Invalid diagram template connector: ${entry.key}`)
    }

    return {
      id: createId(),
      kind: entry.kind ?? 'straight',
      start: {
        ...anchorPoint(startShape, entry.fromAnchor),
        binding: makeAnchorBinding('shape', startId, entry.fromAnchor)
      },
      end: {
        ...anchorPoint(endShape, entry.toAnchor),
        binding: makeAnchorBinding('shape', endId, entry.toAnchor)
      },
      strokeColor: options.formatting.strokeColor,
      strokeWidth: options.formatting.strokeWidth,
      strokeStyle: options.formatting.strokeStyle,
      opacity: options.formatting.opacity,
      startArrow: 'none',
      endArrow: 'arrow',
      text: entry.text,
      textColor: '#000000',
      textFontSize: 14,
      textIsBold: false,
      textIsItalic: false,
      textIsUnderline: false,
      z: zStart + spec.shapes.length + index
    }
  })

  return {
    width: spec.width,
    height: spec.height,
    shapes,
    connectors,
    elements: [
      ...shapes.map((element) => ({ element, type: 'shape' as const })),
      ...connectors.map((element) => ({ element, type: 'connector' as const }))
    ]
  }
}

function anchorPoint(shape: DiagramShape, anchor: AnchorPosition): Point {
  const center = {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2
  }
  switch (anchor) {
    case 'top':
      return { x: center.x, y: shape.y }
    case 'right':
      return { x: shape.x + shape.width, y: center.y }
    case 'bottom':
      return { x: center.x, y: shape.y + shape.height }
    case 'left':
      return { x: shape.x, y: center.y }
  }
}
