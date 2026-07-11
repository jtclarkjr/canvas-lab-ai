import { describe, expect, it } from 'vite-plus/test'
import {
  isTerminalTranscriptStatus,
  mergeCallSessionRealtimeRow,
  transcriptReconciliationDelay
} from '$lib/conference/call-session-realtime'
import type { CallSession } from '$lib/conference/schema'
import type { CallSessionRealtimeRow } from '$lib/conference/call-session-realtime'

const startedAt = '2026-07-11T00:00:00.000Z'

function session(): CallSession {
  return {
    id: 'session-1',
    canvasId: 'canvas-1',
    roomName: 'canvas:canvas-1',
    livekitRoomSid: 'RM_1',
    startedBy: 'user-1',
    startedByName: 'James',
    startedAt,
    endedAt: null,
    transcriptStatus: 'starting',
    transcriptAttempt: 1,
    transcriptErrorCode: null,
    transcriptEnabledBy: 'user-1',
    transcriptEnabledAt: '2026-07-11T00:00:05.000Z',
    transcriptAgentDispatchId: 'AD_1',
    transcriptAgentName: 'canvas-transcriber',
    transcriptAgentJobId: null,
    transcriptModel: 'deepgram/nova-3',
    transcriptAcceptedAt: null,
    transcriptFirstAudioAt: null,
    transcriptFirstSegmentAt: null,
    transcriptCompletedAt: null,
    errorMessage: null,
    summaryStatus: null,
    summary: null,
    artifactCount: 1,
    segmentCount: 2,
    artifacts: [],
    createdAt: startedAt,
    updatedAt: '2026-07-11T00:00:05.000Z'
  }
}

function row(): CallSessionRealtimeRow {
  const current = session()
  return {
    id: current.id,
    canvas_id: current.canvasId,
    room_name: current.roomName,
    livekit_room_sid: current.livekitRoomSid,
    started_by: current.startedBy,
    started_by_name: current.startedByName,
    started_at: current.startedAt,
    ended_at: current.endedAt,
    transcript_status: 'active',
    transcript_attempt: current.transcriptAttempt,
    transcript_error_code: null,
    transcript_enabled_by: current.transcriptEnabledBy,
    transcript_enabled_at: current.transcriptEnabledAt,
    transcript_agent_dispatch_id: current.transcriptAgentDispatchId,
    transcript_agent_name: current.transcriptAgentName,
    transcript_agent_job_id: 'AJ_1',
    transcript_model: current.transcriptModel,
    transcript_accepted_at: '2026-07-11T00:00:07.000Z',
    transcript_first_audio_at: '2026-07-11T00:00:08.000Z',
    transcript_first_segment_at: null,
    transcript_completed_at: null,
    error_message: null,
    metadata: {},
    created_at: current.createdAt,
    updated_at: '2026-07-11T00:00:08.000Z'
  }
}

describe('call session realtime updates', () => {
  it('applies status diagnostics without discarding loaded detail', () => {
    const current = session()
    const merged = mergeCallSessionRealtimeRow(current, row())

    expect(merged.transcriptStatus).toBe('active')
    expect(merged.transcriptAgentJobId).toBe('AJ_1')
    expect(merged.transcriptFirstAudioAt).toBe('2026-07-11T00:00:08.000Z')
    expect(merged.segmentCount).toBe(2)
    expect(merged.artifacts).toBe(current.artifacts)
  })

  it('schedules only starting and processing watchdogs', () => {
    const starting = session()
    expect(
      transcriptReconciliationDelay(
        starting,
        new Date('2026-07-11T00:00:25.000Z').getTime()
      )
    ).toBe(10_000)

    const processing = {
      ...starting,
      transcriptStatus: 'processing' as const,
      endedAt: '2026-07-11T00:01:00.000Z'
    }
    expect(
      transcriptReconciliationDelay(
        processing,
        new Date('2026-07-11T00:01:40.000Z').getTime()
      )
    ).toBe(20_000)
    expect(
      transcriptReconciliationDelay({ ...starting, transcriptStatus: 'active' })
    ).toBeNull()
  })

  it('recognizes terminal states', () => {
    expect(isTerminalTranscriptStatus('ready')).toBe(true)
    expect(isTerminalTranscriptStatus('no_speech')).toBe(true)
    expect(isTerminalTranscriptStatus('failed')).toBe(true)
    expect(isTerminalTranscriptStatus('processing')).toBe(false)
  })
})
