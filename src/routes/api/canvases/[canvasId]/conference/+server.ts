import { json, type RequestHandler } from '@sveltejs/kit'
import {
  conferenceRoomName,
  conferenceStatusResponseSchema
} from '$lib/conference/schema'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { getRoomService } from '$lib/server/livekit'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId } = event.params

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

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

      return json(
        conferenceStatusResponseSchema.parse({
          active: participants.length > 0,
          count: participants.length,
          participants: participants.map((participant) => ({
            identity: participant.identity,
            name: participant.name || participant.identity
          }))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
