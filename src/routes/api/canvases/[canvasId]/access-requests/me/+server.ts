import type { RequestHandler } from '@sveltejs/kit'
import { myAccessRequestResponseSchema } from '#lib/canvas/schema.js'
import { handleApiError, withAccountAuth } from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { data, error } = await supabase
        .from('canvas_access_requests')
        .select('id, canvas_id, status, requested_role, created_at')
        .eq('canvas_id', canvasId)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return Response.json(
        myAccessRequestResponseSchema.parse({
          item: data
            ? {
                id: data.id,
                canvasId: data.canvas_id,
                status: data.status,
                requestedRole: data.requested_role,
                createdAt: data.created_at
              }
            : null
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
