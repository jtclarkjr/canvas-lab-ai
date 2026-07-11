import type { SupabaseClient } from '@supabase/supabase-js'
import { internalServerError, notFound } from '$lib/server/api-error'
import type { Database, Json } from '$lib/server/database.types'
import {
  loadCallTranscriptSession,
  loadTranscriptProgress,
  PROCESSING_RECONCILIATION_MS,
  STARTING_RECONCILIATION_MS,
  transcriptFailureMessage,
  transitionCallTranscript
} from '$lib/server/call-transcript-state'
import {
  callSummarySchema,
  type CallArtifact,
  type CallSession,
  type CallTranscriptSegment
} from '$lib/conference/schema'

type Supabase = SupabaseClient<Database>
type CallSessionRow =
  Database['public']['Tables']['canvas_call_sessions']['Row']
type CallArtifactRow =
  Database['public']['Tables']['canvas_call_artifacts']['Row']
type CallParticipantRow =
  Database['public']['Tables']['canvas_call_participants']['Row']
type CallTranscriptSegmentRow =
  Database['public']['Tables']['canvas_call_transcript_segments']['Row']

type CallUser = {
  id: string
  name?: string | null
  email?: string | null
}

function isRecord(value: Json | null): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberFromMetadata(metadata: Json, key: string, fallback = 0): number {
  if (!isRecord(metadata)) {
    return fallback
  }
  const value = metadata[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function toCallArtifact(row: CallArtifactRow): CallArtifact {
  return {
    id: row.id,
    sessionId: row.session_id,
    canvasId: row.canvas_id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function toCallSession(
  row: CallSessionRow,
  artifacts: CallArtifactRow[] = [],
  segmentCount?: number
): CallSession {
  const mappedArtifacts = artifacts.map(toCallArtifact)
  const transcriptArtifact = artifacts.find(
    (artifact) => artifact.kind === 'transcript'
  )
  const summaryArtifact = artifacts.find(
    (artifact) => artifact.kind === 'summary'
  )
  const parsedSummary = summaryArtifact
    ? callSummarySchema.safeParse(summaryArtifact.metadata)
    : null

  return {
    id: row.id,
    canvasId: row.canvas_id,
    roomName: row.room_name,
    livekitRoomSid: row.livekit_room_sid,
    startedBy: row.started_by,
    startedByName: row.started_by_name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    transcriptStatus: row.transcript_status,
    transcriptAttempt: row.transcript_attempt,
    transcriptErrorCode: row.transcript_error_code,
    transcriptEnabledBy: row.transcript_enabled_by,
    transcriptEnabledAt: row.transcript_enabled_at,
    transcriptAgentDispatchId: row.transcript_agent_dispatch_id,
    transcriptAgentName: row.transcript_agent_name,
    transcriptAgentJobId: row.transcript_agent_job_id,
    transcriptModel: row.transcript_model,
    transcriptAcceptedAt: row.transcript_accepted_at,
    transcriptFirstAudioAt: row.transcript_first_audio_at,
    transcriptFirstSegmentAt: row.transcript_first_segment_at,
    transcriptCompletedAt: row.transcript_completed_at,
    errorMessage: row.error_message,
    summaryStatus: summaryArtifact?.status ?? null,
    summary: parsedSummary?.success ? parsedSummary.data : null,
    artifactCount: mappedArtifacts.length,
    segmentCount:
      segmentCount ??
      (transcriptArtifact
        ? numberFromMetadata(transcriptArtifact.metadata, 'segment_count')
        : 0),
    artifacts: mappedArtifacts,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function toTranscriptSegment(
  row: CallTranscriptSegmentRow
): CallTranscriptSegment {
  return {
    id: row.id,
    sessionId: row.session_id,
    canvasId: row.canvas_id,
    position: row.position,
    speakerIdentity: row.speaker_identity,
    speakerName: row.speaker_name,
    speakerSid: row.speaker_sid,
    text: row.text,
    language: row.language,
    provider: row.provider,
    model: row.model,
    startTimeSeconds: row.start_time_seconds,
    endTimeSeconds: row.end_time_seconds,
    confidence: row.confidence,
    createdAt: row.created_at
  }
}

async function fetchArtifactsForSessions(
  supabase: Supabase,
  sessionIds: string[]
) {
  const artifactsBySession = new Map<string, CallArtifactRow[]>()
  if (sessionIds.length === 0) {
    return artifactsBySession
  }

  const { data, error } = await supabase
    .from('canvas_call_artifacts')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true })

  if (error) {
    throw internalServerError('Could not load call artifacts.', {
      code: 'call_artifacts_query_failed',
      cause: error
    })
  }

  for (const artifact of data ?? []) {
    const list = artifactsBySession.get(artifact.session_id) ?? []
    list.push(artifact)
    artifactsBySession.set(artifact.session_id, list)
  }

  return artifactsBySession
}

function isStaleProcessingSession(row: CallSessionRow) {
  if (row.transcript_status !== 'processing' || !row.ended_at) {
    return false
  }

  const endedAt = new Date(row.ended_at).getTime()
  return (
    Number.isFinite(endedAt) &&
    Date.now() - endedAt > PROCESSING_RECONCILIATION_MS
  )
}

function isStaleStartingSession(row: CallSessionRow) {
  if (row.transcript_status !== 'starting' || !row.transcript_enabled_at) {
    return false
  }

  const enabledAt = new Date(row.transcript_enabled_at).getTime()
  return (
    Number.isFinite(enabledAt) &&
    Date.now() - enabledAt > STARTING_RECONCILIATION_MS
  )
}

async function reconcileTranscriptRow(supabase: Supabase, row: CallSessionRow) {
  if (isStaleStartingSession(row)) {
    const errorCode = 'agent_unavailable' as const
    const progress = await loadTranscriptProgress(supabase, row.id)
    await transitionCallTranscript({
      supabase,
      sessionId: row.id,
      attempt: row.transcript_attempt,
      status: 'failed',
      errorCode,
      errorMessage: transcriptFailureMessage(errorCode),
      segmentCount: progress.segmentCount,
      markCompleted: true
    })
    return loadCallTranscriptSession(supabase, row.id)
  }

  if (!isStaleProcessingSession(row)) {
    return row
  }

  const progress = await loadTranscriptProgress(supabase, row.id)
  if (progress.segmentCount > 0) {
    await transitionCallTranscript({
      supabase,
      sessionId: row.id,
      attempt: row.transcript_attempt,
      status: 'ready',
      segmentCount: progress.segmentCount,
      markCompleted: true
    })
  } else {
    const errorCode = 'worker_did_not_finalize' as const
    await transitionCallTranscript({
      supabase,
      sessionId: row.id,
      attempt: row.transcript_attempt,
      status: 'failed',
      errorCode,
      errorMessage: transcriptFailureMessage(errorCode),
      segmentCount: 0,
      markCompleted: true
    })
  }

  return loadCallTranscriptSession(supabase, row.id)
}

export async function reconcileCallTranscriptSession(
  supabase: Supabase,
  sessionId: string
) {
  return reconcileTranscriptRow(
    supabase,
    await loadCallTranscriptSession(supabase, sessionId)
  )
}

export async function findOpenCallSession(
  supabase: Supabase,
  canvasId: string
) {
  const { data, error } = await supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('canvas_id', canvasId)
    .is('ended_at', null)
    .maybeSingle()

  if (error) {
    throw internalServerError('Could not load the active call session.', {
      code: 'call_session_query_failed',
      cause: error
    })
  }

  return data
}

export async function getOrCreateActiveCallSession({
  supabase,
  canvasId,
  roomName,
  roomSid,
  user
}: {
  supabase: Supabase
  canvasId: string
  roomName: string
  roomSid?: string | null
  user: CallUser
}) {
  const existing = await findOpenCallSession(supabase, canvasId)
  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('canvas_call_sessions')
    .insert({
      canvas_id: canvasId,
      room_name: roomName,
      livekit_room_sid: roomSid ?? null,
      started_by: user.id,
      started_by_name: user.name || user.email || null
    })
    .select('*')
    .single()

  if (!error && data) {
    return data
  }

  const raced = await findOpenCallSession(supabase, canvasId)
  if (raced) {
    return raced
  }

  throw internalServerError('Could not create the call session.', {
    code: 'call_session_insert_failed',
    cause: error
  })
}

export async function recordCallSessionParticipant({
  supabase,
  session,
  user,
  participantSid
}: {
  supabase: Supabase
  session: CallSessionRow
  user: CallUser
  participantSid?: string | null
}) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('canvas_call_participants')
    .upsert(
      {
        session_id: session.id,
        canvas_id: session.canvas_id,
        user_id: user.id,
        participant_identity: user.id,
        participant_name: user.name || user.email || null,
        participant_sid: participantSid ?? null,
        last_seen_at: now,
        left_at: null
      },
      { onConflict: 'session_id,user_id' }
    )
    .select('*')
    .single()

  if (error) {
    throw internalServerError('Could not record call participation.', {
      code: 'call_participant_upsert_failed',
      cause: error
    })
  }

  return data
}

export async function recordCallSessionParticipantForRoom({
  supabase,
  roomName,
  roomSid,
  participantIdentity,
  participantName,
  participantSid
}: {
  supabase: Supabase
  roomName: string
  roomSid?: string | null
  participantIdentity: string
  participantName?: string | null
  participantSid?: string | null
}) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      participantIdentity
    )
  ) {
    return null
  }

  const { data: session, error } = await supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('room_name', roomName)
    .is('ended_at', null)
    .maybeSingle()

  if (error) {
    throw internalServerError('Could not load the active call session.', {
      code: 'call_session_query_failed',
      cause: error
    })
  }
  if (!session) return null
  if (
    roomSid &&
    session.livekit_room_sid &&
    session.livekit_room_sid !== roomSid
  ) {
    return null
  }

  return recordCallSessionParticipant({
    supabase,
    session,
    user: { id: participantIdentity, name: participantName },
    participantSid
  })
}

export async function findCallSessionParticipant(
  supabase: Supabase,
  sessionId: string,
  userId: string
): Promise<CallParticipantRow | null> {
  const { data, error } = await supabase
    .from('canvas_call_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw internalServerError('Could not load call participation.', {
      code: 'call_participant_query_failed',
      cause: error
    })
  }

  return data
}

export async function requireCallSessionParticipant(
  supabase: Supabase,
  sessionId: string,
  userId: string
) {
  const participant = await findCallSessionParticipant(
    supabase,
    sessionId,
    userId
  )
  if (!participant) {
    throw notFound('Transcript session not found.', {
      code: 'call_session_not_found',
      details: { sessionId }
    })
  }

  return participant
}

export async function endOpenCallSessions(
  supabase: Supabase,
  canvasId: string
) {
  const { data, error } = await supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('canvas_id', canvasId)
    .is('ended_at', null)

  if (error) {
    throw internalServerError('Could not load active call sessions.', {
      code: 'call_session_query_failed',
      cause: error
    })
  }

  await Promise.all(
    (data ?? []).map((session) => closeCallSession(supabase, session.id))
  )
}

export async function closeCallSession(
  supabase: Supabase,
  sessionId: string,
  endedAt = new Date().toISOString()
) {
  const { data, error } = await supabase.rpc('close_canvas_call_session', {
    p_session_id: sessionId,
    p_ended_at: endedAt
  })

  if (error) {
    throw internalServerError('Could not close the call session.', {
      code: 'call_session_update_failed',
      cause: error
    })
  }

  if (data) {
    const { error: participantError } = await supabase
      .from('canvas_call_participants')
      .update({ left_at: endedAt, last_seen_at: endedAt })
      .eq('session_id', sessionId)
      .is('left_at', null)

    if (participantError) {
      throw internalServerError('Could not close call participation.', {
        code: 'call_participant_update_failed',
        cause: participantError
      })
    }
  }

  return data
}

export async function endCallSessionForRoom({
  supabase,
  roomName,
  roomSid,
  endedAt
}: {
  supabase: Supabase
  roomName: string
  roomSid?: string | null
  endedAt?: string
}) {
  const { data: session, error } = await supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('room_name', roomName)
    .is('ended_at', null)
    .maybeSingle()

  if (error) {
    throw internalServerError('Could not load the active call session.', {
      code: 'call_session_query_failed',
      cause: error
    })
  }
  if (!session) return null
  if (
    roomSid &&
    session.livekit_room_sid &&
    session.livekit_room_sid !== roomSid
  ) {
    return null
  }

  await closeCallSession(supabase, session.id, endedAt)
  return loadCallTranscriptSession(supabase, session.id)
}

export async function listTranscriptCallSessions(
  supabase: Supabase,
  canvasId: string,
  userId: string,
  canViewAllCallSessions = false
) {
  let sessionIds: string[] | null = null

  if (!canViewAllCallSessions) {
    const { data: participations, error: participantError } = await supabase
      .from('canvas_call_participants')
      .select('session_id')
      .eq('canvas_id', canvasId)
      .eq('user_id', userId)

    if (participantError) {
      throw internalServerError('Could not load call participation.', {
        code: 'call_participant_query_failed',
        cause: participantError
      })
    }

    sessionIds = [
      ...new Set((participations ?? []).map((row) => row.session_id))
    ]
    if (sessionIds.length === 0) {
      return []
    }
  }

  let query = supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('canvas_id', canvasId)
    .neq('transcript_status', 'not_requested')

  if (sessionIds) {
    query = query.in('id', sessionIds)
  }

  const { data, error } = await query
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) {
    throw internalServerError('Could not load call sessions.', {
      code: 'call_sessions_query_failed',
      cause: error
    })
  }

  const rows = await Promise.all(
    (data ?? []).map((row) => reconcileTranscriptRow(supabase, row))
  )
  const artifactsBySession = await fetchArtifactsForSessions(
    supabase,
    rows.map((row) => row.id)
  )

  return rows.map((row) =>
    toCallSession(row, artifactsBySession.get(row.id) ?? [])
  )
}

export async function getCallSessionWithSegments(
  supabase: Supabase,
  canvasId: string,
  sessionId: string,
  userId: string,
  canViewAllCallSessions = false
) {
  if (!canViewAllCallSessions) {
    await requireCallSessionParticipant(supabase, sessionId, userId)
  }

  const { data: session, error } = await supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('canvas_id', canvasId)
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    throw internalServerError('Could not load the call session.', {
      code: 'call_session_query_failed',
      cause: error
    })
  }

  if (!session || session.transcript_status === 'not_requested') {
    throw notFound('Transcript session not found.', {
      code: 'call_session_not_found',
      details: { canvasId, sessionId }
    })
  }
  const recoveredSession = await reconcileTranscriptRow(supabase, session)

  const [
    { data: artifacts, error: artifactsError },
    { data: segments, error: segmentsError }
  ] = await Promise.all([
    supabase
      .from('canvas_call_artifacts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('canvas_call_transcript_segments')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true })
  ])

  if (artifactsError) {
    throw internalServerError('Could not load call artifacts.', {
      code: 'call_artifacts_query_failed',
      cause: artifactsError
    })
  }
  if (segmentsError) {
    throw internalServerError('Could not load transcript segments.', {
      code: 'call_segments_query_failed',
      cause: segmentsError
    })
  }

  const mappedSegments = (segments ?? []).map(toTranscriptSegment)

  return {
    item: toCallSession(
      recoveredSession,
      artifacts ?? [],
      mappedSegments.length
    ),
    segments: mappedSegments
  }
}

export async function loadCallSessionResponse(
  supabase: Supabase,
  row: CallSessionRow
) {
  const recoveredRow = await reconcileTranscriptRow(supabase, row)
  const artifactsBySession = await fetchArtifactsForSessions(supabase, [
    recoveredRow.id
  ])
  return toCallSession(
    recoveredRow,
    artifactsBySession.get(recoveredRow.id) ?? []
  )
}
