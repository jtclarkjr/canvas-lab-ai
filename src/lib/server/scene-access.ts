import type { SupabaseClient } from '@supabase/supabase-js'
import { forbidden, notFound } from '$lib/server/api-error'
import type { Database } from '$lib/server/database.types'
import type { CanvasRole } from '$lib/canvas/roles'

type SceneRow = Database['public']['Tables']['canvas_scenes']['Row']
type SceneDocumentRow =
  Database['public']['Tables']['canvas_scene_documents']['Row']

// Loads a scene and guards against cross-canvas access: a scene id is only
// valid within its own canvas (same hijack guard as canvas elements).
export async function requireScene(
  supabase: SupabaseClient<Database>,
  canvasId: string,
  sceneId: string
): Promise<SceneRow> {
  const { data, error } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.canvas_id !== canvasId) {
    throw notFound('Scene not found.', {
      code: 'scene_not_found',
      details: { sceneId }
    })
  }

  return data
}

// Editors may only modify scenes they created; admins/owners modify all.
// Callers must already have enforced a minimum role of 'editor'.
export function assertSceneModify(
  role: CanvasRole,
  scene: SceneRow,
  userId: string
) {
  if (role === 'editor' && scene.created_by !== userId) {
    throw forbidden('You can only modify scenes you created.', {
      code: 'scene_forbidden',
      details: { sceneId: scene.id }
    })
  }
}

// Loads a document and guards against cross-scene access.
export async function requireSceneDocument(
  supabase: SupabaseClient<Database>,
  sceneId: string,
  documentId: string
): Promise<SceneDocumentRow> {
  const { data, error } = await supabase
    .from('canvas_scene_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.scene_id !== sceneId) {
    throw notFound('Document not found.', {
      code: 'document_not_found',
      details: { documentId }
    })
  }

  return data
}
