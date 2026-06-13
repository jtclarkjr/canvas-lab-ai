import { z } from 'zod'
import type {
  AnchorPosition,
  Arrowhead,
  ConnectorKind,
  DiagramConnector,
  DiagramEndpoint,
  DiagramShape,
  Path,
  ShapeKind,
  StrokeStyle,
  TextElement
} from '$lib/canvas/types'
import type { CanvasElement } from '$lib/workspace/schema'
import type { RealtimeCanvasElementRow } from '$lib/workspace/types'
import { applyLegacyListStyle } from '$lib/canvas/text-lists'
import {
  normalizeConnectorKind,
  normalizeShapeKind,
  normalizeStrokeStyle
} from '$lib/canvas/diagram-utils'

const pointSchema = z.object({ x: z.number(), y: z.number() })
const strokeStyleSchema = z
  .enum(['solid', 'dashed', 'dotted'])
  .catch('solid')
  .default('solid')
const shapeKindSchema = z
  .enum(['rectangle', 'diamond', 'ellipse'])
  .catch('rectangle')
  .default('rectangle')
const connectorKindSchema = z
  .enum(['straight', 'elbow', 'curved'])
  .catch('straight')
  .default('straight')
const arrowheadSchema = z.enum(['none', 'arrow']).catch('none').default('none')
const anchorSchema = z.enum(['top', 'right', 'bottom', 'left'])

const endpointSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  binding: z
    .object({
      shapeId: z.string(),
      anchor: anchorSchema
    })
    .nullable()
    .optional()
})

export const pathDataSchema = z
  .object({
    points: z.array(pointSchema).default([]),
    color: z.string().default('#000000'),
    width: z.number().default(2),
    opacity: z.number().min(0).max(1).default(1)
  })
  .nullable()
  .catch(null)

export const textDataSchema = z
  .object({
    text: z.string().default(''),
    color: z.string().default('#000000'),
    fontSize: z.number().default(16),
    isBold: z.boolean().default(false),
    isItalic: z.boolean().default(false),
    isUnderline: z.boolean().default(false),
    listStyle: z
      .enum(['none', 'bullet', 'number'])
      .catch('none')
      .default('none')
  })
  .nullable()
  .catch(null)

export const shapeDataSchema = z
  .object({
    kind: shapeKindSchema,
    width: z.number().min(1).default(160),
    height: z.number().min(1).default(96),
    rotation: z.number().default(0),
    fillColor: z.string().default('#ffffff'),
    strokeColor: z.string().default('#000000'),
    strokeWidth: z.number().min(1).default(2),
    strokeStyle: strokeStyleSchema,
    opacity: z.number().min(0).max(1).default(1),
    text: z.string().default(''),
    textColor: z.string().default('#000000'),
    textFontSize: z.number().default(16),
    textIsBold: z.boolean().default(false),
    textIsItalic: z.boolean().default(false),
    textIsUnderline: z.boolean().default(false)
  })
  .nullable()
  .catch(null)

export const connectorDataSchema = z
  .object({
    kind: connectorKindSchema,
    start: endpointSchema.default({ x: 0, y: 0 }),
    end: endpointSchema.default({ x: 0, y: 0 }),
    strokeColor: z.string().default('#000000'),
    strokeWidth: z.number().min(1).default(2),
    strokeStyle: strokeStyleSchema,
    opacity: z.number().min(0).max(1).default(1),
    startArrow: arrowheadSchema,
    endArrow: arrowheadSchema.catch('arrow').default('arrow')
  })
  .nullable()
  .catch(null)

export const realtimeRowSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    data: z.unknown(),
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional(),
    z: z.number().nullable().optional(),
    created_by: z.string().nullable().optional()
  })
  .nullable()
  .catch(null)

export const deletedRowSchema = z
  .object({ id: z.string() })
  .nullable()
  .catch(null)

export function canvasElementOwnerEntries(
  items: CanvasElement[]
): Array<[string, string | null]> {
  return items.map((element) => [element.id, element.createdBy ?? null])
}

export function canvasElementToPath(element: CanvasElement): Path | null {
  if (element.type !== 'path') {
    return null
  }

  const pathData = pathDataSchema.parse(element.data)

  return {
    id: element.id,
    points: pathData?.points || [],
    color: pathData?.color || '#000000',
    width: pathData?.width || 2,
    opacity: pathData?.opacity ?? 1,
    z: element.z ?? null
  }
}

export function canvasElementToText(
  element: CanvasElement
): TextElement | null {
  if (element.type !== 'text') {
    return null
  }

  const textData = textDataSchema.parse(element.data)

  return {
    id: element.id,
    text: applyLegacyListStyle(textData?.text || '', textData?.listStyle),
    x: element.x ?? 0,
    y: element.y ?? 0,
    color: textData?.color || '#000000',
    fontSize: textData?.fontSize || 16,
    isBold: textData?.isBold || false,
    isItalic: textData?.isItalic || false,
    isUnderline: textData?.isUnderline || false,
    z: element.z ?? null
  }
}

export function canvasElementToShape(
  element: CanvasElement
): DiagramShape | null {
  if (element.type !== 'shape') {
    return null
  }

  const shapeData = shapeDataSchema.parse(element.data)
  if (!shapeData) {
    return null
  }

  return {
    id: element.id,
    kind: normalizeShapeKind(shapeData.kind) as ShapeKind,
    x: element.x ?? 0,
    y: element.y ?? 0,
    width: shapeData.width,
    height: shapeData.height,
    rotation: shapeData.rotation,
    fillColor: shapeData.fillColor,
    strokeColor: shapeData.strokeColor,
    strokeWidth: shapeData.strokeWidth,
    strokeStyle: normalizeStrokeStyle(shapeData.strokeStyle) as StrokeStyle,
    opacity: shapeData.opacity,
    text: shapeData.text,
    textColor: shapeData.textColor,
    textFontSize: shapeData.textFontSize,
    textIsBold: shapeData.textIsBold,
    textIsItalic: shapeData.textIsItalic,
    textIsUnderline: shapeData.textIsUnderline,
    z: element.z ?? null
  }
}

function normalizeEndpoint(endpoint: DiagramEndpoint): DiagramEndpoint {
  return {
    x: endpoint.x,
    y: endpoint.y,
    binding: endpoint.binding
      ? {
          shapeId: endpoint.binding.shapeId,
          anchor: endpoint.binding.anchor as AnchorPosition
        }
      : null
  }
}

export function canvasElementToConnector(
  element: CanvasElement
): DiagramConnector | null {
  if (element.type !== 'connector') {
    return null
  }

  const connectorData = connectorDataSchema.parse(element.data)
  if (!connectorData) {
    return null
  }

  return {
    id: element.id,
    kind: normalizeConnectorKind(connectorData.kind) as ConnectorKind,
    start: normalizeEndpoint(connectorData.start),
    end: normalizeEndpoint(connectorData.end),
    strokeColor: connectorData.strokeColor,
    strokeWidth: connectorData.strokeWidth,
    strokeStyle: normalizeStrokeStyle(connectorData.strokeStyle) as StrokeStyle,
    opacity: connectorData.opacity,
    startArrow: connectorData.startArrow as Arrowhead,
    endArrow: connectorData.endArrow as Arrowhead,
    z: element.z ?? null
  }
}

export function canvasElementsToDrawingState(items: CanvasElement[]) {
  return {
    paths: items
      .map(canvasElementToPath)
      .filter((path): path is Path => path !== null),
    textElements: items
      .map(canvasElementToText)
      .filter((text): text is TextElement => text !== null),
    shapes: items
      .map(canvasElementToShape)
      .filter((shape): shape is DiagramShape => shape !== null),
    connectors: items
      .map(canvasElementToConnector)
      .filter((connector): connector is DiagramConnector => connector !== null),
    owners: new Map(canvasElementOwnerEntries(items))
  }
}

export function realtimeRowToPath(row: RealtimeCanvasElementRow): Path | null {
  if (row.type !== 'path') {
    return null
  }

  const pathData = pathDataSchema.parse(row.data)
  if (!pathData) {
    return null
  }

  return {
    id: row.id,
    points: pathData.points,
    color: pathData.color,
    width: pathData.width,
    opacity: pathData.opacity,
    z: row.z ?? null
  }
}

export function realtimeRowToText(
  row: RealtimeCanvasElementRow
): TextElement | null {
  if (row.type !== 'text') {
    return null
  }

  const textData = textDataSchema.parse(row.data)
  if (!textData) {
    return null
  }

  return {
    id: row.id,
    text: applyLegacyListStyle(textData.text, textData.listStyle),
    color: textData.color,
    fontSize: textData.fontSize,
    isBold: textData.isBold,
    isItalic: textData.isItalic,
    isUnderline: textData.isUnderline,
    x: row.x ?? 0,
    y: row.y ?? 0,
    z: row.z ?? null
  }
}

export function realtimeRowToShape(
  row: RealtimeCanvasElementRow
): DiagramShape | null {
  return canvasElementToShape({
    id: row.id,
    canvasId: '',
    type: row.type,
    data: row.data,
    x: row.x ?? 0,
    y: row.y ?? 0,
    z: row.z ?? null
  })
}

export function realtimeRowToConnector(
  row: RealtimeCanvasElementRow
): DiagramConnector | null {
  return canvasElementToConnector({
    id: row.id,
    canvasId: '',
    type: row.type,
    data: row.data,
    x: row.x ?? 0,
    y: row.y ?? 0,
    z: row.z ?? null
  })
}
