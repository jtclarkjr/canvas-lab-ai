import { json, type RequestHandler } from '@sveltejs/kit'
import {
  badRequest,
  handleApiError,
  internalServerError,
  requireRouteParam,
  withAuth
} from '$lib/server/api-error'
import {
  findOpenCallSession,
  loadCallSessionResponse,
  recordCallSessionParticipant
} from '$lib/server/call-sessions'
import {
  claimCallTranscript,
  loadCallTranscriptSession,
  transcriptFailureMessage,
  transitionCallTranscript
} from '$lib/server/call-transcript-state'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  getAgentDispatchService,
  getLiveKitTranscriptionConfig,
  getRoomService
} from '$lib/server/livekit'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { startCallTranscriptionResponseSchema } from '$lib/conference/schema'

const NON_RETRYABLE_STATUSES = new Set([
  'starting',
  'active',
  'processing',
  'ready',
  'no_speech'
])

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

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const session = await findOpenCallSession(supabase, canvasId)
      if (!session) {
        throw badRequest('Join the call before starting transcription.', {
          code: 'no_active_call_session',
          details: { canvasId }
        })
      }

      let participants: Awaited<
        ReturnType<ReturnType<typeof getRoomService>['listParticipants']>
      > = []
      try {
        participants = await getRoomService().listParticipants(
          session.room_name
        )
      } catch {
        participants = []
      }
      if (participants.length === 0) {
        throw badRequest('Join the call before starting transcription.', {
          code: 'no_active_call',
          details: { canvasId, sessionId: session.id }
        })
      }
      const currentParticipant = participants.find(
        (participant) => participant.identity === user.id
      )
      if (!currentParticipant) {
        throw badRequest('Join the call before starting transcription.', {
          code: 'not_in_call_session',
          details: { canvasId, sessionId: session.id }
        })
      }
      await recordCallSessionParticipant({
        supabase,
        session,
        user,
        participantSid: currentParticipant.sid
      })

      if (NON_RETRYABLE_STATUSES.has(session.transcript_status)) {
        return json(
          startCallTranscriptionResponseSchema.parse({
            item: await loadCallSessionResponse(supabase, session)
          })
        )
      }

      const transcriptionConfig = getLiveKitTranscriptionConfig()
      const { claimed, session: startingSession } = await claimCallTranscript({
        supabase,
        sessionId: session.id,
        enabledBy: user.id,
        agentName: transcriptionConfig.agentName,
        model: transcriptionConfig.model
      })

      if (!claimed) {
        return json(
          startCallTranscriptionResponseSchema.parse({
            item: await loadCallSessionResponse(supabase, startingSession)
          })
        )
      }

      try {
        const dispatch = await getAgentDispatchService().createDispatch(
          session.room_name,
          transcriptionConfig.agentName,
          {
            metadata: JSON.stringify({
              canvasId,
              callSessionId: session.id,
              transcriptAttempt: startingSession.transcript_attempt,
              roomName: session.room_name,
              enabledBy: user.id,
              model: transcriptionConfig.model,
              language: transcriptionConfig.language
            })
          }
        )
        const dispatchRecord = dispatch as unknown as {
          id?: string
          dispatchId?: string
        }
        await transitionCallTranscript({
          supabase,
          sessionId: session.id,
          attempt: startingSession.transcript_attempt,
          status: 'starting',
          dispatchId: dispatchRecord.id ?? dispatchRecord.dispatchId ?? null
        })
        const dispatchedSession = await loadCallTranscriptSession(
          supabase,
          session.id
        )

        return json(
          startCallTranscriptionResponseSchema.parse({
            item: await loadCallSessionResponse(supabase, dispatchedSession)
          })
        )
      } catch (error) {
        const errorCode = 'dispatch_failed' as const
        await transitionCallTranscript({
          supabase,
          sessionId: session.id,
          attempt: startingSession.transcript_attempt,
          status: 'failed',
          errorCode,
          errorMessage: transcriptFailureMessage(errorCode),
          markCompleted: true
        })

        throw internalServerError(
          'Could not dispatch the transcription agent.',
          {
            code: 'transcription_dispatch_failed',
            cause: error
          }
        )
      }
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
