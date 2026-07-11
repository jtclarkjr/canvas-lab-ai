import { json, type RequestHandler } from '@sveltejs/kit'
import { roleAtLeast } from '$lib/canvas/roles'
import { getCallSessionResponseSchema } from '$lib/conference/schema'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import {
  getCallSessionWithSegments,
  reconcileCallTranscriptSession,
  requireCallSessionParticipant
} from '$lib/server/call-sessions'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

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

      return json(
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
