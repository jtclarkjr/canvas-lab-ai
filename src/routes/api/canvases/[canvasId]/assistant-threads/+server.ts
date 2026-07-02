import { json, type RequestHandler } from '@sveltejs/kit'
import {
  assistantThreadRowSchema,
  assistantThreadRowToThread,
  listAssistantThreadsResponseSchema
} from '$lib/chat/schema'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  handleApiError,
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

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const { data, error } = await supabase
        .from('canvas_assistant_threads')
        .select('id, canvas_id, title, created_at, updated_at')
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      return json(
        listAssistantThreadsResponseSchema.parse({
          items: (data ?? []).map((row) =>
            assistantThreadRowToThread(assistantThreadRowSchema.parse(row))
          )
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
