import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canvasRowSchema,
  listCanvasesResponseSchema,
  type Canvas,
  type CanvasRow,
  type ListCanvasesResponse
} from '$lib/canvas/schema'
import type { CanvasRole, MemberRole } from '$lib/canvas/roles'
import type { Database } from '$lib/server/database.types'
import type { CanvasListData } from '$lib/server/types'
import { withCanvasIconUrls } from '$lib/server/canvas-icons'

type CanvasMembership = Pick<
  Database['public']['Tables']['canvas_members']['Row'],
  'canvas_id' | 'role'
>

export function createEmptyCanvasListData(): CanvasListData {
  return { items: [], error: null }
}

export const toCanvas = (row: CanvasRow, role?: CanvasRole): Canvas => ({
  id: row.id,
  title: row.title,
  createdBy: row.created_by,
  createdAt: row.created_at,
  visibility: row.visibility,
  iconPath: row.icon_path,
  iconUrl: null,
  ...(role ? { role } : null)
})

export function buildCanvasListResponse({
  ownedRows,
  memberships,
  sharedRows
}: {
  ownedRows: unknown[]
  memberships: CanvasMembership[]
  sharedRows: unknown[]
}): ListCanvasesResponse {
  const roleByCanvasId = new Map<string, MemberRole>(
    memberships.map((membership) => [membership.canvas_id, membership.role])
  )

  const items = [
    ...ownedRows.map((row) => toCanvas(canvasRowSchema.parse(row), 'owner')),
    ...sharedRows.map((row) => {
      const canvas = canvasRowSchema.parse(row)
      return toCanvas(canvas, roleByCanvasId.get(canvas.id))
    })
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return listCanvasesResponseSchema.parse({ items })
}

export async function listCanvasesForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ListCanvasesResponse> {
  const [owned, memberships] = await Promise.all([
    supabase.from('canvases').select('*').eq('created_by', userId),
    supabase
      .from('canvas_members')
      .select('canvas_id, role')
      .eq('user_id', userId)
  ])

  if (owned.error) {
    throw owned.error
  }

  if (memberships.error) {
    throw memberships.error
  }

  const sharedIds = (memberships.data ?? []).map(
    (membership) => membership.canvas_id
  )
  const shared = sharedIds.length
    ? await supabase.from('canvases').select('*').in('id', sharedIds)
    : { data: [], error: null }

  if (shared.error) {
    throw shared.error
  }

  const response = buildCanvasListResponse({
    ownedRows: owned.data ?? [],
    memberships: memberships.data ?? [],
    sharedRows: shared.data ?? []
  })

  return listCanvasesResponseSchema.parse({
    items: await withCanvasIconUrls(supabase, response.items)
  })
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const row = (overrides: Partial<CanvasRow>): CanvasRow => ({
    id: 'canvas-1',
    title: 'Canvas',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
    visibility: 'private',
    icon_path: null,
    ...overrides
  })

  describe('canvas list server helpers', () => {
    it('marks owned and shared roles and sorts newest first', () => {
      const response = buildCanvasListResponse({
        ownedRows: [row({ id: 'owned', title: 'Owned' })],
        memberships: [{ canvas_id: 'shared', role: 'editor' }],
        sharedRows: [
          row({
            id: 'shared',
            title: 'Shared',
            created_by: 'user-2',
            created_at: '2026-01-02T00:00:00.000Z'
          })
        ]
      })

      expect(response.items.map((canvas) => canvas.id)).toEqual([
        'shared',
        'owned'
      ])
      expect(response.items[0].role).toBe('editor')
      expect(response.items[1].role).toBe('owner')
    })

    it('maps canvas icon paths onto list items', () => {
      const response = buildCanvasListResponse({
        ownedRows: [row({ icon_path: 'canvases/canvas-1/icon-123.png' })],
        memberships: [],
        sharedRows: []
      })

      expect(response.items[0].iconPath).toBe('canvases/canvas-1/icon-123.png')
      expect(response.items[0].iconUrl).toBeNull()
    })
  })
}
