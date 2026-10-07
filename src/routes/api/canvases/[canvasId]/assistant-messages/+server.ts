import type { RequestHandler } from '@sveltejs/kit'
import { listAssistantMessagesResponseSchema } from '#lib/chat/schema.js'
import { requireCanvasMember } from '#lib/server/canvas-access.js'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

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

      const { data: latestThread, error: latestThreadError } = await supabase
        .from('canvas_assistant_threads')
        .select('id')
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestThreadError) {
        throw latestThreadError
      }

      if (!latestThread) {
        return Response.json(
          listAssistantMessagesResponseSchema.parse({ items: [] })
        )
      }

      const { data, error } = await supabase
        .from('canvas_assistant_messages')
        .select('id, role, parts, metadata, created_at')
        .eq('thread_id', latestThread.id)
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return Response.json(
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
