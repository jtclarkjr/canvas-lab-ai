import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vite-plus/test'
import {
  canTransitionTranscriptStatus,
  claimCallTranscript,
  loadTranscriptProgress,
  nextTranscriptPosition,
  transcriptFailureMessage,
  type CallSessionRow
} from '$lib/server/call-transcript-state'
import type { Database } from '$lib/server/database.types'

function sessionRow(): CallSessionRow {
  return {
    id: 'session-1',
    canvas_id: 'canvas-1',
    room_name: 'canvas:canvas-1',
    livekit_room_sid: 'RM_1',
    started_by: 'user-1',
    started_by_name: 'James',
    started_at: '2026-07-11T00:00:00.000Z',
    ended_at: null,
    transcript_status: 'starting',
    transcript_attempt: 1,
    transcript_error_code: null,
    transcript_enabled_by: 'user-1',
    transcript_enabled_at: '2026-07-11T00:00:01.000Z',
    transcript_agent_dispatch_id: null,
    transcript_agent_name: 'canvas-transcriber',
    transcript_agent_job_id: null,
    transcript_model: 'deepgram/nova-3',
    transcript_accepted_at: null,
    transcript_first_audio_at: null,
    transcript_first_segment_at: null,
    transcript_completed_at: null,
    error_message: null,
    metadata: {},
    created_at: '2026-07-11T00:00:00.000Z',
    updated_at: '2026-07-11T00:00:01.000Z'
  }
}

describe('call transcript state', () => {
  it('enforces the lifecycle and protects terminal states', () => {
    expect(canTransitionTranscriptStatus('not_requested', 'starting')).toBe(
      true
    )
    expect(canTransitionTranscriptStatus('starting', 'active')).toBe(true)
    expect(canTransitionTranscriptStatus('active', 'processing')).toBe(true)
    expect(canTransitionTranscriptStatus('processing', 'ready')).toBe(true)
    expect(canTransitionTranscriptStatus('processing', 'no_speech')).toBe(true)
    expect(canTransitionTranscriptStatus('ready', 'processing')).toBe(false)
    expect(canTransitionTranscriptStatus('no_speech', 'processing')).toBe(false)
    expect(canTransitionTranscriptStatus('failed', 'starting')).toBe(true)
    expect(canTransitionTranscriptStatus('failed', 'failed')).toBe(false)
  })

  it('allows only one concurrent requester to own a dispatch claim', async () => {
    let owned = false
    const row = sessionRow()
    const supabase = {
      rpc: async () => {
        const claimed = !owned
        owned = true
        return { data: claimed, error: null }
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: row, error: null })
          })
        })
      })
    } as unknown as SupabaseClient<Database>

    const results = await Promise.all([
      claimCallTranscript({
        supabase,
        sessionId: row.id,
        enabledBy: 'user-1',
        agentName: 'canvas-transcriber',
        model: 'deepgram/nova-3'
      }),
      claimCallTranscript({
        supabase,
        sessionId: row.id,
        enabledBy: 'user-1',
        agentName: 'canvas-transcriber',
        model: 'deepgram/nova-3'
      })
    ])

    expect(results.filter((result) => result.claimed)).toHaveLength(1)
  })

  it('resumes after the greatest stored segment position', async () => {
    let query = 0
    const supabase = {
      from: () => {
        query += 1
        if (query === 1) {
          return {
            select: () => ({
              eq: async () => ({ count: 5, error: null })
            })
          }
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: { position: 8 },
                    error: null
                  })
                })
              })
            })
          })
        }
      }
    } as unknown as SupabaseClient<Database>

    await expect(
      loadTranscriptProgress(supabase, 'session-1')
    ).resolves.toEqual({
      segmentCount: 5,
      nextPosition: 9
    })
    expect(nextTranscriptPosition(null)).toBe(0)
  })

  it('uses stable user-facing failure messages', () => {
    expect(transcriptFailureMessage('agent_unavailable')).toContain(
      'did not accept'
    )
    expect(transcriptFailureMessage('finalization_timeout')).toContain(
      'timed out'
    )
  })
})
