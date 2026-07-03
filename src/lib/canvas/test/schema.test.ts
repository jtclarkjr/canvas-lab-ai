import { describe, expect, it } from 'vite-plus/test'
import {
  accessRequestSchema,
  canvasRowSchema,
  canvasSchema,
  createCanvasInputSchema,
  requestAccessInputSchema
} from '$lib/canvas/schema'
import {
  updateCanvasInputSchema,
  upsertElementInputSchema
} from '$lib/workspace/schema'

describe('canvas schema', () => {
  it('trims and validates canvas titles', () => {
    expect(createCanvasInputSchema.parse({ title: '  Sketch  ' }).title).toBe(
      'Sketch'
    )

    expect(() => createCanvasInputSchema.parse({ title: '' })).toThrow()
  })

  it('accepts canvas element payloads with optional ids and nullable data', () => {
    const input = upsertElementInputSchema.parse({
      canvasId: 'canvas-1',
      type: 'text',
      data: null,
      x: 10,
      y: 20
    })

    expect(input.canvasId).toBe('canvas-1')
    expect(input.id).toBeUndefined()
    expect(input.data).toBeNull()
  })

  it('defaults canvas visibility and icon fields when columns are absent', () => {
    const row = canvasRowSchema.parse({
      id: 'canvas-1',
      title: 'Sketch',
      created_by: 'user-1',
      created_at: '2026-06-12T00:00:00Z'
    })
    expect(row.visibility).toBe('private')
    expect(row.icon_path).toBeNull()
    expect(row.updated_at).toBeUndefined()

    const canvas = canvasSchema.parse({
      id: 'canvas-1',
      title: 'Sketch',
      createdBy: 'user-1',
      createdAt: '2026-06-12T00:00:00Z'
    })
    expect(canvas.visibility).toBe('private')
    expect(canvas.updatedAt).toBe('2026-06-12T00:00:00Z')
    expect(canvas.iconPath).toBeNull()
    expect(canvas.iconUrl).toBeNull()
  })

  it('accepts nullable canvas icon fields', () => {
    const row = canvasRowSchema.parse({
      id: 'canvas-1',
      title: 'Sketch',
      created_by: 'user-1',
      created_at: '2026-06-12T00:00:00Z',
      icon_path: 'canvases/canvas-1/icon-123.png'
    })
    expect(row.icon_path).toBe('canvases/canvas-1/icon-123.png')

    const canvas = canvasSchema.parse({
      id: 'canvas-1',
      title: 'Sketch',
      createdBy: 'user-1',
      createdAt: '2026-06-12T00:00:00Z',
      updatedAt: '2026-06-13T00:00:00Z',
      iconPath: 'canvases/canvas-1/icon-123.png',
      iconUrl: 'https://example.com/icon.png'
    })
    expect(canvas.updatedAt).toBe('2026-06-13T00:00:00Z')
    expect(canvas.iconPath).toBe('canvases/canvas-1/icon-123.png')
    expect(canvas.iconUrl).toBe('https://example.com/icon.png')
  })

  it('accepts visibility updates and rejects unknown values', () => {
    expect(
      updateCanvasInputSchema.parse({ visibility: 'public' }).visibility
    ).toBe('public')
    expect(() =>
      updateCanvasInputSchema.parse({ visibility: 'unlisted' })
    ).toThrow()
  })

  it('accepts access requests with and without a requested role', () => {
    expect(requestAccessInputSchema.parse({}).requestedRole).toBeUndefined()
    expect(
      requestAccessInputSchema.parse({ requestedRole: 'editor' }).requestedRole
    ).toBe('editor')
    expect(() =>
      requestAccessInputSchema.parse({ requestedRole: 'owner' })
    ).toThrow()
  })

  it('tolerates missing or null requestedRole on access request rows', () => {
    const base = {
      id: 'request-1',
      canvasId: 'canvas-1',
      status: 'pending',
      createdAt: '2026-06-12T00:00:00Z'
    }

    expect(accessRequestSchema.parse(base).requestedRole).toBeUndefined()
    expect(
      accessRequestSchema.parse({ ...base, requestedRole: null }).requestedRole
    ).toBeNull()
    expect(
      accessRequestSchema.parse({ ...base, requestedRole: 'editor' })
        .requestedRole
    ).toBe('editor')
  })
})
