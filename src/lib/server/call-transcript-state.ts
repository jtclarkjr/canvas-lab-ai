import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type TranscriptStatus =
  Database['public']['Enums']['canvas_call_transcript_status']
export type TranscriptErrorCode =
  Database['public']['Enums']['canvas_call_transcript_error_code']
export type CallSessionRow =
  Database['public']['Tables']['canvas_call_sessions']['Row']

type Supabase = SupabaseClient<Database>

export const STARTING_RECONCILIATION_MS = 30_000
export const PROCESSING_RECONCILIATION_MS = 60_000

const TRANSCRIPT_TRANSITIONS: Record<TranscriptStatus, TranscriptStatus[]> = {
  not_requested: ['starting'],
  starting: ['starting', 'active', 'failed'],
  active: ['active', 'processing', 'failed'],
  processing: ['processing', 'ready', 'no_speech', 'failed'],
  ready: [],
  no_speech: [],
  failed: ['starting']
}

export function canTransitionTranscriptStatus(
  from: TranscriptStatus,
  to: TranscriptStatus
) {
  return TRANSCRIPT_TRANSITIONS[from].includes(to)
}

export function isTranscriptTerminal(status: TranscriptStatus) {
  return status === 'ready' || status === 'no_speech' || status === 'failed'
}

export function nextTranscriptPosition(
  lastPosition: number | null | undefined
) {
  return (lastPosition ?? -1) + 1
}

export function transcriptFailureMessage(code: TranscriptErrorCode) {
  switch (code) {
    case 'agent_unavailable':
      return 'The transcription agent did not accept the job.'
    case 'agent_connect_failed':
      return 'The transcription agent could not connect to the call.'
    case 'dispatch_failed':
      return 'Could not dispatch the transcription agent.'
    case 'no_audio_received':
      return 'The transcription agent did not receive any audio.'
    case 'no_speech_detected':
      return 'No speech was detected during this transcription attempt.'
    case 'stt_failed':
      return 'The speech-to-text service failed while transcribing the call.'
    case 'finalization_timeout':
      return 'The transcription worker timed out while finalizing the call.'
    case 'worker_did_not_finalize':
      return 'The transcription worker did not finalize the session.'
  }
}

export async function loadCallTranscriptSession(
  supabase: Supabase,
  sessionId: string
) {
  const { data, error } = await supabase
    .from('canvas_call_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    throw new Error(`Could not load call transcript session: ${error.message}`)
  }

  return data
}

export async function claimCallTranscript({
  supabase,
  sessionId,
  enabledBy,
  agentName,
  model
}: {
  supabase: Supabase
  sessionId: string
  enabledBy: string
  agentName: string
  model: string
}) {
  const { data: claimed, error } = await supabase.rpc(
    'claim_canvas_call_transcription',
    {
      p_session_id: sessionId,
      p_enabled_by: enabledBy,
      p_agent_name: agentName,
      p_model: model
    }
  )

  if (error) {
    throw new Error(`Could not claim transcript session: ${error.message}`)
  }

  return {
    claimed: claimed === true,
    session: await loadCallTranscriptSession(supabase, sessionId)
  }
}

export async function transitionCallTranscript({
  supabase,
  sessionId,
  attempt,
  status,
  errorCode = null,
  errorMessage = null,
  dispatchId = null,
  agentJobId = null,
  segmentCount = null,
  markAccepted = false,
  markFirstAudio = false,
  markFirstSegment = false,
  markCompleted = false
}: {
  supabase: Supabase
  sessionId: string
  attempt: number
  status: TranscriptStatus
  errorCode?: TranscriptErrorCode | null
  errorMessage?: string | null
  dispatchId?: string | null
  agentJobId?: string | null
  segmentCount?: number | null
  markAccepted?: boolean
  markFirstAudio?: boolean
  markFirstSegment?: boolean
  markCompleted?: boolean
}) {
  const { data, error } = await supabase.rpc(
    'transition_canvas_call_transcript',
    {
      p_session_id: sessionId,
      p_attempt: attempt,
      p_status: status,
      p_error_code: errorCode,
      p_error_message: errorMessage,
      p_dispatch_id: dispatchId,
      p_agent_job_id: agentJobId,
      p_segment_count: segmentCount,
      p_mark_accepted: markAccepted,
      p_mark_first_audio: markFirstAudio,
      p_mark_first_segment: markFirstSegment,
      p_mark_completed: markCompleted
    }
  )

  if (error) {
    throw new Error(`Could not transition transcript session: ${error.message}`)
  }

  return data === true
}

export async function loadTranscriptProgress(
  supabase: Supabase,
  sessionId: string
) {
  const [countResult, positionResult] = await Promise.all([
    supabase
      .from('canvas_call_transcript_segments')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId),
    supabase
      .from('canvas_call_transcript_segments')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  if (countResult.error) {
    throw new Error(
      `Could not count transcript segments: ${countResult.error.message}`
    )
  }
  if (positionResult.error) {
    throw new Error(
      `Could not load transcript position: ${positionResult.error.message}`
    )
  }

  return {
    segmentCount: countResult.count ?? 0,
    nextPosition: nextTranscriptPosition(positionResult.data?.position)
  }
}
