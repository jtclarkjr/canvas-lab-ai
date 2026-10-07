import type { RequestHandler } from '@sveltejs/kit'
import { roleAtLeast } from '#lib/canvas/roles.js'
import { getCallSessionResponseSchema } from '#lib/conference/schema.js'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '#lib/server/api-error.js'
import {
  getCallSessionWithSegments,
  reconcileCallTranscriptSession,
  requireCallSessionParticipant
} from '#lib/server/call-sessions.js'
import { requireCanvasMember } from '#lib/server/canvas-access.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )
      const sessionId = requireRouteParam(
        event.params.sessionId,
        'Session id',
        'sessionId'
      )
      const { role } = await requireCanvasMember(
        supabase,
        canvasId,
        user.id,
        'reader'
      )
      const canViewAll = roleAtLeast(role, 'admin')

      if (!canViewAll) {
        await requireCallSessionParticipant(supabase, sessionId, user.id)
      }

      await reconcileCallTranscriptSession(supabase, sessionId)

      return Response.json(
        getCallSessionResponseSchema.parse(
          await getCallSessionWithSegments(
            supabase,
            canvasId,
            sessionId,
            user.id,
            canViewAll
          )
        )
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
