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

export const callTranscriptStatusSchema = z.enum([
  'not_requested',
  'starting',
  'active',
  'processing',
  'ready',
  'no_speech',
  'failed'
])

export const callTranscriptErrorCodeSchema = z.enum([
  'agent_unavailable',
  'agent_connect_failed',
  'dispatch_failed',
  'no_audio_received',
  'no_speech_detected',
  'stt_failed',
  'finalization_timeout',
  'worker_did_not_finalize'
])

export const callArtifactKindSchema = z.enum([
  'transcript',
  'recording',
  'summary'
])

export const callArtifactStatusSchema = z.enum([
  'processing',
  'ready',
  'failed'
])

export const callSummaryActionItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  owner: z.string().trim().min(1).max(120).nullable()
})

export const callSummarySchema = z.object({
  title: z.string().trim().min(1).max(120),
  overview: z.string().trim().min(1).max(4000),
  keyPoints: z.array(z.string().trim().min(1).max(500)).max(8),
  decisions: z.array(z.string().trim().min(1).max(500)).max(8),
  actionItems: z.array(callSummaryActionItemSchema).max(8),
  model: z.string().trim().min(1).max(120),
  generatedAt: z.string(),
  sourceSegmentCount: z.number().int().nonnegative(),
  wasTruncated: z.boolean()
})

export const callArtifactSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  canvasId: z.string(),
  kind: callArtifactKindSchema,
  status: callArtifactStatusSchema,
  title: z.string().nullable(),
  storageBucket: z.string().nullable(),
  storagePath: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const callSessionSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  roomName: z.string(),
  livekitRoomSid: z.string().nullable(),
  startedBy: z.string().nullable(),
  startedByName: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  transcriptStatus: callTranscriptStatusSchema,
  transcriptAttempt: z.number().int().nonnegative(),
  transcriptErrorCode: callTranscriptErrorCodeSchema.nullable(),
  transcriptEnabledBy: z.string().nullable(),
  transcriptEnabledAt: z.string().nullable(),
  transcriptAgentDispatchId: z.string().nullable(),
  transcriptAgentName: z.string().nullable(),
  transcriptAgentJobId: z.string().nullable(),
  transcriptModel: z.string().nullable(),
  transcriptAcceptedAt: z.string().nullable(),
  transcriptFirstAudioAt: z.string().nullable(),
  transcriptFirstSegmentAt: z.string().nullable(),
  transcriptCompletedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  summaryStatus: callArtifactStatusSchema.nullable(),
  summary: callSummarySchema.nullable(),
  artifactCount: z.number().int().nonnegative(),
  segmentCount: z.number().int().nonnegative(),
  artifacts: z.array(callArtifactSchema),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const callTranscriptSegmentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  canvasId: z.string(),
  position: z.number().int().nonnegative(),
  speakerIdentity: z.string(),
  speakerName: z.string().nullable(),
  speakerSid: z.string().nullable(),
  text: z.string(),
  language: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  startTimeSeconds: z.number().nullable(),
  endTimeSeconds: z.number().nullable(),
  confidence: z.number().nullable(),
  createdAt: z.string()
})

export const listCallSessionsResponseSchema = z.object({
  items: z.array(callSessionSchema)
})

export const getCallSessionResponseSchema = z.object({
  item: callSessionSchema,
  segments: z.array(callTranscriptSegmentSchema)
})

export const startCallTranscriptionResponseSchema = z.object({
  item: callSessionSchema
})

export const conferenceTokenResponseSchema = z.object({
  token: z.string(),
  url: z.url(),
  roomName: z.string(),
  callSession: callSessionSchema.nullable()
})

export const conferenceStatusResponseSchema = z.object({
  active: z.boolean(),
  count: z.int().nonnegative(),
  participants: z.array(
    z.object({
      identity: z.string(),
      name: z.string()
    })
  ),
  callSession: callSessionSchema.nullable()
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
export type CallTranscriptStatus = z.infer<typeof callTranscriptStatusSchema>
export type CallTranscriptErrorCode = z.infer<
  typeof callTranscriptErrorCodeSchema
>
export type CallArtifactKind = z.infer<typeof callArtifactKindSchema>
export type CallArtifactStatus = z.infer<typeof callArtifactStatusSchema>
export type CallArtifact = z.infer<typeof callArtifactSchema>
export type CallSummaryActionItem = z.infer<typeof callSummaryActionItemSchema>
export type CallSummary = z.infer<typeof callSummarySchema>
export type CallSession = z.infer<typeof callSessionSchema>
export type CallTranscriptSegment = z.infer<typeof callTranscriptSegmentSchema>
export type ListCallSessionsResponse = z.infer<
  typeof listCallSessionsResponseSchema
>
export type GetCallSessionResponse = z.infer<
  typeof getCallSessionResponseSchema
>
export type StartCallTranscriptionResponse = z.infer<
  typeof startCallTranscriptionResponseSchema
>
export type CaptionsTokenResponse = z.infer<typeof captionsTokenResponseSchema>
export type TranslateCaptionInput = z.infer<typeof translateCaptionInputSchema>
export type TranslateCaptionResponse = z.infer<
  typeof translateCaptionResponseSchema
>
