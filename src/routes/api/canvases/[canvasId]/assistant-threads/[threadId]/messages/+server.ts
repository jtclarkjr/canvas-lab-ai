import { json, type RequestHandler } from '@sveltejs/kit'
import { listAssistantMessagesResponseSchema } from '$lib/chat/schema'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  handleApiError,
  notFound,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

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
      const threadId = requireRouteParam(
        event.params.threadId,
        'Thread id',
        'threadId'
      )

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const { data: thread, error: threadError } = await supabase
        .from('canvas_assistant_threads')
        .select('id')
        .eq('id', threadId)
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (threadError) {
        throw threadError
      }
      if (!thread) {
        throw notFound('Assistant history not found.', {
          code: 'assistant_thread_not_found',
          details: { canvasId, threadId }
        })
      }

      const { data, error } = await supabase
        .from('canvas_assistant_messages')
        .select('id, role, parts, metadata, created_at')
        .eq('thread_id', threadId)
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
