import { json, type RequestHandler } from '@sveltejs/kit'
import { listAssistantMessagesResponseSchema } from '$lib/chat/schema'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// Assistant history is read-only over HTTP: messages are persisted
// server-side by the canvas-assistant AI route when a generation finishes.
// Threads are private — only the caller's own messages are returned.
export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const { data, error } = await supabase
        .from('canvas_assistant_messages')
        .select('id, role, parts, metadata, created_at')
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return json(
        listAssistantMessagesResponseSchema.parse({
          items: (data ?? []).map((row) => ({
            id: row.id,
            role: row.role,
            parts: row.parts,
            metadata: row.metadata,
            createdAt: row.created_at
          }))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
