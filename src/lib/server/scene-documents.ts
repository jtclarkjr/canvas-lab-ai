import type { SupabaseClient } from '@supabase/supabase-js'
import { sceneDocumentRowToListItem } from '$lib/scenes/mapping'
import {
  listSceneDocumentItemsResponseSchema,
  sceneDocumentListItemRowSchema,
  type ListSceneDocumentItemsResponse,
  type SceneDocumentListItem,
  type SceneDocumentStatus
} from '$lib/scenes/schema'
import type { Database } from '$lib/server/database.types'

export type SceneDocumentListsBySceneId = Record<string, SceneDocumentListItem[]>

export const SCENE_DOCUMENT_LIST_COLUMNS =
  'id, scene_id, canvas_id, kind, status, title, created_by, updated_by, created_at, updated_at'

export function groupSceneDocumentItemsBySceneId(
  items: SceneDocumentListItem[]
): SceneDocumentListsBySceneId {
  return items.reduce<SceneDocumentListsBySceneId>((grouped, item) => {
    grouped[item.sceneId] = [...(grouped[item.sceneId] ?? []), item]
    return grouped
  }, {})
}

export async function listSceneDocumentItemsForCanvas(
  supabase: SupabaseClient<Database>,
  canvasId: string
): Promise<ListSceneDocumentItemsResponse> {
  const { data, error } = await supabase
    .from('canvas_scene_documents')
    .select(SCENE_DOCUMENT_LIST_COLUMNS)
    .eq('canvas_id', canvasId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return listSceneDocumentItemsResponseSchema.parse({
    items: (data ?? []).map((row) =>
      sceneDocumentRowToListItem(sceneDocumentListItemRowSchema.parse(row))
    )
  })
}

export async function listSceneDocumentItemsForScene(
  supabase: SupabaseClient<Database>,
  sceneId: string,
  status?: SceneDocumentStatus
): Promise<ListSceneDocumentItemsResponse> {
  let query = supabase
    .from('canvas_scene_documents')
    .select(SCENE_DOCUMENT_LIST_COLUMNS)
    .eq('scene_id', sceneId)
    .order('updated_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return listSceneDocumentItemsResponseSchema.parse({
    items: (data ?? []).map((row) =>
      sceneDocumentRowToListItem(sceneDocumentListItemRowSchema.parse(row))
    )
  })
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('scene document server helpers', () => {
    it('groups document list items by scene id', () => {
      const item = (
        id: string,
        sceneId: string,
        updatedAt: string
      ): SceneDocumentListItem => ({
        id,
        sceneId,
        canvasId: 'canvas-1',
        kind: 'markdown',
        status: 'draft',
        title: id,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: updatedAt,
        updatedAt
      })

      const grouped = groupSceneDocumentItemsBySceneId([
        item('doc-1', 'scene-1', '2026-01-01T00:00:00.000Z'),
        item('doc-2', 'scene-2', '2026-01-02T00:00:00.000Z'),
        item('doc-3', 'scene-1', '2026-01-03T00:00:00.000Z')
      ])

      expect(grouped['scene-1'].map((entry) => entry.id)).toEqual([
        'doc-1',
        'doc-3'
      ])
      expect(grouped['scene-2'].map((entry) => entry.id)).toEqual(['doc-2'])
    })
  })
}
