import type { SupabaseClient } from '@supabase/supabase-js'
import { sceneRowToScene } from '$lib/scenes/mapping'
import {
  listScenesResponseSchema,
  sceneRowSchema,
  type ListScenesResponse,
  type Scene,
  type SceneRow
} from '$lib/scenes/schema'
import type { Database } from '$lib/server/database.types'

export function toCanvasScene(row: unknown): Scene {
  return sceneRowToScene(sceneRowSchema.parse(row))
}

export async function listCanvasScenesForCanvas(
  supabase: SupabaseClient<Database>,
  canvasId: string
): Promise<ListScenesResponse> {
  const { data, error } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return listScenesResponseSchema.parse({
    items: (data ?? []).map(toCanvasScene)
  })
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const row = (overrides: Partial<SceneRow> = {}): SceneRow => ({
    id: 'scene-1',
    canvas_id: 'canvas-1',
    type: 'document',
    title: 'Scene',
    x: 10,
    y: 20,
    width: 320,
    height: 200,
    rotation: 0,
    settings: { preview: 'Summary' },
    created_by: 'user-1',
    updated_by: 'user-2',
    created_at: '2026-06-12T00:00:00.000Z',
    updated_at: '2026-06-12T00:00:01.000Z',
    ...overrides
  })

  describe('canvas scene server helpers', () => {
    it('maps database rows to API scenes', () => {
      expect(toCanvasScene(row())).toEqual({
        id: 'scene-1',
        canvasId: 'canvas-1',
        type: 'document',
        title: 'Scene',
        x: 10,
        y: 20,
        width: 320,
        height: 200,
        rotation: 0,
        settings: { preview: 'Summary' },
        createdBy: 'user-1',
        updatedBy: 'user-2',
        createdAt: '2026-06-12T00:00:00.000Z',
        updatedAt: '2026-06-12T00:00:01.000Z'
      })
    })

    it('loads scenes oldest creation first', async () => {
      const calls: unknown[] = []
      type FakeQuery = {
        select: (columns: string) => FakeQuery
        eq: (column: string, value: string) => FakeQuery
        order: (
          column: string,
          options: { ascending: boolean }
        ) => { data: SceneRow[]; error: null }
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
          return { data: [row()], error: null }
        }
      }

      const supabase = {
        from: (table: string) => {
          calls.push(['from', table])
          return query
        }
      } as unknown as SupabaseClient<Database>

      const response = await listCanvasScenesForCanvas(supabase, 'canvas-1')

      expect(response.items).toHaveLength(1)
      expect(calls).toContainEqual(['from', 'canvas_scenes'])
      expect(calls).toContainEqual(['eq', 'canvas_id', 'canvas-1'])
      expect(calls).toContainEqual(['order', 'created_at', { ascending: true }])
    })
  })
}
