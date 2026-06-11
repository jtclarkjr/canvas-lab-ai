import { json, type RequestHandler } from '@sveltejs/kit'
import { myAccessRequestResponseSchema } from '$lib/canvas/schema'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { data, error } = await supabase
        .from('canvas_access_requests')
        .select('id, canvas_id, status, created_at')
        .eq('canvas_id', canvasId)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return json(
        myAccessRequestResponseSchema.parse({
          item: data
            ? {
                id: data.id,
                canvasId: data.canvas_id,
                status: data.status,
                createdAt: data.created_at
              }
            : null
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
