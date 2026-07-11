import { json, type RequestHandler } from '@sveltejs/kit'
import {
  conferenceRoomName,
  conferenceStatusResponseSchema
} from '$lib/conference/schema'
import {
  handleApiError,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import {
  endOpenCallSessions,
  findOpenCallSession,
  loadCallSessionResponse
} from '$lib/server/call-sessions'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { getRoomService } from '$lib/server/livekit'
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

      let participants: Awaited<
        ReturnType<ReturnType<typeof getRoomService>['listParticipants']>
      > = []
      try {
        participants = await getRoomService().listParticipants(
          conferenceRoomName(canvasId)
        )
      } catch {
        // LiveKit answers not_found for rooms that don't exist (or already
        // emptied out) — that's the normal "no call" condition.
        participants = []
      }

      const openSession =
        participants.length > 0
          ? await findOpenCallSession(supabase, canvasId)
          : null

      if (participants.length === 0) {
        await endOpenCallSessions(supabase, canvasId)
      }

      return json(
        conferenceStatusResponseSchema.parse({
          active: participants.length > 0,
          count: participants.length,
          participants: participants.map((participant) => ({
            identity: participant.identity,
            name: participant.name || participant.identity
          })),
          callSession: openSession
            ? await loadCallSessionResponse(supabase, openSession)
            : null
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
