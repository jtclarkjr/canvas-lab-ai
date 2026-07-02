import { json, type RequestHandler } from '@sveltejs/kit'
import {
  assistantThreadResponseSchema,
  assistantThreadRowSchema,
  assistantThreadRowToThread,
  updateAssistantThreadInputSchema
} from '$lib/chat/schema'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

export const PATCH: RequestHandler = async (event) =>
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

      const payload = await parseJsonBody(event.request)
      const input = parseInput(updateAssistantThreadInputSchema, payload)

      const { data, error } = await supabase
        .from('canvas_assistant_threads')
        .update({
          title: input.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .select('id, canvas_id, title, created_at, updated_at')
        .maybeSingle()

      if (error) {
        throw error
      }
      if (!data) {
        throw notFound('Assistant history not found.', {
          code: 'assistant_thread_not_found',
          details: { canvasId, threadId }
        })
      }

      return json(
        assistantThreadResponseSchema.parse({
          item: assistantThreadRowToThread(assistantThreadRowSchema.parse(data))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const DELETE: RequestHandler = async (event) =>
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

      const { data, error } = await supabase
        .from('canvas_assistant_threads')
        .delete()
        .eq('id', threadId)
        .eq('canvas_id', canvasId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle()

      if (error) {
        throw error
      }
      if (!data) {
        throw notFound('Assistant history not found.', {
          code: 'assistant_thread_not_found',
          details: { canvasId, threadId }
        })
      }

      return json({ ok: true })
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
