import type { RequestHandler } from '@sveltejs/kit'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '#lib/server/api-error.js'
import { roleAtLeast } from '#lib/canvas/roles.js'
import { listCallSessionsResponseSchema } from '#lib/conference/schema.js'
import { requireCanvasMember } from '#lib/server/canvas-access.js'
import { listTranscriptCallSessions } from '#lib/server/call-sessions.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

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

      return Response.json(
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
