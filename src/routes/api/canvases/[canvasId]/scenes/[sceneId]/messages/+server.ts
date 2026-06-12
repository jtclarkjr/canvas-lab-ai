import { json, type RequestHandler } from '@sveltejs/kit'
import {
  listSceneMessagesResponseSchema,
  sceneMessageRowSchema
} from '$lib/scenes/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { requireScene } from '$lib/server/scene-access'
import { sceneMessageRowToMessage } from '$lib/scenes/mapping'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// Chat history is read-only over HTTP: messages are persisted server-side
// by the AI chat route when a generation finishes.
export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId, sceneId } = event.params

      if (!canvasId || !sceneId) {
        return json({ message: 'Canvas and scene ids are required.' }, { status: 400 })
      }

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')
      await requireScene(supabase, canvasId, sceneId)

      // Chat threads are per document: pass ?documentId= to load one
      // document's conversation.
      const documentId = event.url.searchParams.get('documentId')

      let query = supabase
        .from('canvas_scene_messages')
        .select('*')
        .eq('scene_id', sceneId)
        .order('created_at', { ascending: true })

      if (documentId) {
        query = query.eq('document_id', documentId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const rows = (data ?? []).map((row) => sceneMessageRowSchema.parse(row))

      // Resolve fresh author display names from profiles (also covers
      // messages persisted before authors were stamped into metadata).
      const authorIds = [
        ...new Set(
          rows
            .map((row) => row.created_by)
            .filter((id): id is string => id !== null)
        )
      ]
      const authorNames = new Map<string, string>()
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', authorIds)
        for (const profile of profiles ?? []) {
          authorNames.set(profile.id, profile.display_name || profile.email)
        }
      }

      return json(
        listSceneMessagesResponseSchema.parse({
          items: rows.map((row) => {
            const message = sceneMessageRowToMessage(row)
            const resolvedName = row.created_by
              ? authorNames.get(row.created_by)
              : undefined
            return {
              ...message,
              author: resolvedName
                ? { id: row.created_by as string, name: resolvedName }
                : message.author
            }
          })
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
