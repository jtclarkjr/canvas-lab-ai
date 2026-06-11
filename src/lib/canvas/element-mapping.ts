import { z } from 'zod'
import type { CanvasElement } from '$lib/canvas/schema'
import type { Path, Point, RealtimeCanvasElementRow, TextElement } from '$lib/canvas/types'
import { applyLegacyListStyle } from '$lib/canvas/text-lists'

const pointSchema = z.object({ x: z.number(), y: z.number() })

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
    listStyle: z.enum(['none', 'bullet', 'number']).catch('none').default('none')
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
    created_by: z.string().nullable().optional()
  })
  .nullable()
  .catch(null)

export const deletedRowSchema = z.object({ id: z.string() }).nullable().catch(null)

export function canvasElementOwnerEntries(items: CanvasElement[]): Array<[string, string | null]> {
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
    opacity: pathData?.opacity ?? 1
  }
}

export function canvasElementToText(element: CanvasElement): TextElement | null {
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
    isUnderline: textData?.isUnderline || false
  }
}

export function canvasElementsToDrawingState(items: CanvasElement[]) {
  return {
    paths: items.map(canvasElementToPath).filter((path): path is Path => path !== null),
    textElements: items.map(canvasElementToText).filter((text): text is TextElement => text !== null),
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
    opacity: pathData.opacity
  }
}

export function realtimeRowToText(row: RealtimeCanvasElementRow): TextElement | null {
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
    y: row.y ?? 0
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
