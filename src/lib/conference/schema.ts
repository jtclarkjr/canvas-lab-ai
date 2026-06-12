import { z } from 'zod'

// Room name doubles as the LiveKit agent dispatch target later, so keep it
// predictable and derived only from the canvas id.
export function conferenceRoomName(canvasId: string) {
  return `canvas:${canvasId}`
}

// Supabase broadcast channel used as a "something changed" nudge; the status
// endpoint stays the source of truth for who is actually in the room.
export function conferenceChannelName(canvasId: string) {
  return `canvas:${canvasId}:conference`
}

export const conferenceTokenResponseSchema = z.object({
  token: z.string(),
  url: z.url(),
  roomName: z.string()
})

export const conferenceStatusResponseSchema = z.object({
  active: z.boolean(),
  count: z.int().nonnegative(),
  participants: z.array(
    z.object({
      identity: z.string(),
      name: z.string()
    })
  )
})

export type ConferenceTokenResponse = z.infer<
  typeof conferenceTokenResponseSchema
>
export type ConferenceStatusResponse = z.infer<
  typeof conferenceStatusResponseSchema
>
