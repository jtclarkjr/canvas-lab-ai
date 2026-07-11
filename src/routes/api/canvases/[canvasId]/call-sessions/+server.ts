import { json, type RequestHandler } from '@sveltejs/kit'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import { roleAtLeast } from '$lib/canvas/roles'
import { listCallSessionsResponseSchema } from '$lib/conference/schema'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { listTranscriptCallSessions } from '$lib/server/call-sessions'
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

      const { role } = await requireCanvasMember(
        supabase,
        canvasId,
        user.id,
        'reader'
      )

      return json(
        listCallSessionsResponseSchema.parse({
          items: await listTranscriptCallSessions(
            supabase,
            canvasId,
            user.id,
            roleAtLeast(role, 'admin')
          )
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
