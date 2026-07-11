import type { Database } from '$lib/server/database.types'
import type { CallSession, CallTranscriptStatus } from '$lib/conference/schema'

export type CallSessionRealtimeRow =
  Database['public']['Tables']['canvas_call_sessions']['Row']

const RECONCILIATION_DELAY_MS: Partial<Record<CallTranscriptStatus, number>> = {
  starting: 30_000,
  processing: 60_000
}

export function isTerminalTranscriptStatus(status: CallTranscriptStatus) {
  return status === 'ready' || status === 'no_speech' || status === 'failed'
}

export function mergeCallSessionRealtimeRow(
  current: CallSession,
  row: CallSessionRealtimeRow
): CallSession {
  return {
    ...current,
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
    updatedAt: row.updated_at
  }
}

export function transcriptReconciliationDelay(
  session: CallSession,
  now = Date.now()
) {
  const timeout = RECONCILIATION_DELAY_MS[session.transcriptStatus]
  if (!timeout) return null

  const anchor =
    session.transcriptStatus === 'starting'
      ? session.transcriptEnabledAt
      : (session.endedAt ?? session.updatedAt)
  const anchorTime = anchor ? new Date(anchor).getTime() : now
  const elapsed = Number.isFinite(anchorTime)
    ? Math.max(0, now - anchorTime)
    : 0
  return Math.max(0, timeout - elapsed)
}

export function transcriptWatchdogKey(session: CallSession) {
  return `${session.id}:${session.transcriptAttempt}:${session.transcriptStatus}`
}
