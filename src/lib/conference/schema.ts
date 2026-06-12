import { z } from 'zod'
import { CAPTION_LANGUAGE_CODES } from '$lib/conference/captions'

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

// Ephemeral OpenAI realtime client secret for a transcription session.
// Browser-safe: short-lived and scoped to a single session. `model` is the
// transcription model the server actually managed to mint a session for —
// the client re-asserts it in its post-connect session.update.
export const captionsTokenResponseSchema = z.object({
  clientSecret: z.string(),
  expiresAt: z.number().nullable(),
  model: z.string()
})

export const translateCaptionInputSchema = z.object({
  text: z.string().trim().min(1).max(800),
  language: z.enum(CAPTION_LANGUAGE_CODES)
})

export const translateCaptionResponseSchema = z.object({
  text: z.string()
})

export type ConferenceTokenResponse = z.infer<
  typeof conferenceTokenResponseSchema
>
export type ConferenceStatusResponse = z.infer<
  typeof conferenceStatusResponseSchema
>
export type CaptionsTokenResponse = z.infer<typeof captionsTokenResponseSchema>
export type TranslateCaptionInput = z.infer<typeof translateCaptionInputSchema>
export type TranslateCaptionResponse = z.infer<
  typeof translateCaptionResponseSchema
>
