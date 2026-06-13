import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canvasElementRowSchema,
  listElementsResponseSchema,
  type CanvasElement,
  type CanvasElementRow,
  type ListElementsResponse
} from '$lib/workspace/schema'
import type { Database } from '$lib/server/database.types'

export function toCanvasElement(row: unknown): CanvasElement {
  const element = canvasElementRowSchema.parse(row)

  return {
    id: element.id,
    canvasId: element.canvas_id,
    type: element.type,
    data: element.data,
    x: element.x,
    y: element.y,
    z: element.z,
    createdBy: element.created_by ?? null,
    updatedBy: element.updated_by,
    updatedAt: element.updated_at
  }
}

export async function listCanvasElementsForCanvas(
  supabase: SupabaseClient<Database>,
  canvasId: string
): Promise<ListElementsResponse> {
  const { data, error } = await supabase
    .from('canvas_elements')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('z', { ascending: true, nullsFirst: true })
    .order('updated_at', { ascending: true })

  if (error) {
    throw error
  }

  return listElementsResponseSchema.parse({
    items: (data ?? []).map(toCanvasElement)
  })
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const row = (
    overrides: Partial<CanvasElementRow> = {}
  ): CanvasElementRow => ({
    id: 'element-1',
    canvas_id: 'canvas-1',
    type: 'text',
    data: { text: 'Hello' },
    x: 10,
    y: 20,
    z: null,
    created_by: 'user-1',
    updated_by: 'user-2',
    updated_at: '2026-06-12T00:00:00.000Z',
    ...overrides
  })

  describe('canvas element server helpers', () => {
    it('maps database rows to API elements', () => {
      expect(toCanvasElement(row({ created_by: null }))).toEqual({
        id: 'element-1',
        canvasId: 'canvas-1',
        type: 'text',
        data: { text: 'Hello' },
        x: 10,
        y: 20,
        z: null,
        createdBy: null,
        updatedBy: 'user-2',
        updatedAt: '2026-06-12T00:00:00.000Z'
      })
    })

    it('loads elements oldest update first', async () => {
      const calls: unknown[] = []
      type FakeQuery = {
        select: (columns: string) => FakeQuery
        eq: (column: string, value: string) => FakeQuery
        order: (
          column: string,
          options: object
        ) =>
          | FakeQuery
          | {
              data: CanvasElementRow[]
              error: null
            }
      }

      let query: FakeQuery
      query = {
        select: (columns) => {
          calls.push(['select', columns])
          return query
        },
        eq: (column, value) => {
          calls.push(['eq', column, value])
          return query
        },
        order: (column, options) => {
          calls.push(['order', column, options])
          if (column === 'z') {
            return query
          }
          return { data: [row()], error: null }
        }
      }

      const supabase = {
        from: (table: string) => {
          calls.push(['from', table])
          return query
        }
      } as unknown as SupabaseClient<Database>

      const response = await listCanvasElementsForCanvas(supabase, 'canvas-1')

      expect(response.items).toHaveLength(1)
      expect(calls).toContainEqual(['from', 'canvas_elements'])
      expect(calls).toContainEqual(['eq', 'canvas_id', 'canvas-1'])
      expect(calls).toContainEqual([
        'order',
        'z',
        { ascending: true, nullsFirst: true }
      ])
      expect(calls).toContainEqual(['order', 'updated_at', { ascending: true }])
    })
  })
}
