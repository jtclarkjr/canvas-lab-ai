import { json, type RequestHandler } from '@sveltejs/kit'
import { AccessToken } from 'livekit-server-sdk'
import { colorFromId } from '$lib/canvas/helpers/color-from-id'
import {
  conferenceRoomName,
  conferenceTokenResponseSchema
} from '$lib/conference/schema'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { getLiveKitConfig, getRoomService } from '$lib/server/livekit'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// Without explicit creation LiveKit auto-creates rooms with a 5-minute
// empty timeout, leaving ended calls looking active. Close them shortly
// after the last participant leaves instead; nothing is stored in the room,
// so the next join just recreates it.
const EMPTY_ROOM_TIMEOUT_SECONDS = 30

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId } = event.params

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

      // Members-only, matching canvas chat: public viewers of public
      // canvases cannot join calls.
      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const { url, apiKey, apiSecret } = getLiveKitConfig()
      const roomName = conferenceRoomName(canvasId)

      // Idempotent: returns the existing room when a call is already
      // running, so every joiner can pass the same timeout options.
      await getRoomService().createRoom({
        name: roomName,
        emptyTimeout: EMPTY_ROOM_TIMEOUT_SECONDS
      })

      const token = new AccessToken(apiKey, apiSecret, {
        // identity = user id so call tiles reuse the same deterministic
        // presence colors as cursors and avatars.
        identity: user.id,
        name: user.name || user.email,
        metadata: JSON.stringify({ color: colorFromId(user.id) }),
        ttl: '1h'
      })

      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        // Lets the client set participant attributes (the captions on/off
        // flag rides on them).
        canUpdateOwnMetadata: true
      })

      return json(
        conferenceTokenResponseSchema.parse({
          token: await token.toJwt(),
          url,
          roomName
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
