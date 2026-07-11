import { inference, llm } from '@livekit/agents'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { callSummarySchema, type CallSummary } from '../lib/conference/schema'
import {
  transcriptForSummary,
  type TranscriptSegmentLike
} from '../lib/conference/transcript'
import type { Database, Json } from '../lib/server/database.types'

type Supabase = SupabaseClient<Database>
type TranscriptSegmentRow =
  Database['public']['Tables']['canvas_call_transcript_segments']['Row']

export const DEFAULT_SUMMARY_MODEL = 'openai/gpt-4.1-mini'

const SUMMARY_TIMEOUT_MS = 15_000
const MAX_TRANSCRIPT_CHARACTERS = 240_000
const SEGMENT_PAGE_SIZE = 1000

const generatedSummarySchema = z.object({
  title: z.string().trim().min(1).max(120),
  overview: z.string().trim().min(1).max(4000),
  keyPoints: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
  decisions: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
  actionItems: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
        owner: z.string().trim().min(1).max(120).nullable().default(null)
      })
    )
    .max(8)
    .default([])
})

function segmentFromRow(row: TranscriptSegmentRow): TranscriptSegmentLike {
  return {
    id: row.id,
    position: row.position,
    speakerIdentity: row.speaker_identity,
    speakerName: row.speaker_name,
    text: row.text,
    startTimeSeconds: row.start_time_seconds,
    endTimeSeconds: row.end_time_seconds
  }
}

export function parseGeneratedCallSummary(raw: string) {
  const withoutFence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('Summary model did not return a JSON object.')
  }
  return generatedSummarySchema.parse(
    JSON.parse(withoutFence.slice(start, end + 1))
  )
}

function truncateTranscript(transcript: string) {
  if (transcript.length <= MAX_TRANSCRIPT_CHARACTERS) {
    return { transcript, wasTruncated: false }
  }

  const headLength = Math.floor(MAX_TRANSCRIPT_CHARACTERS * 0.6)
  const tailLength = MAX_TRANSCRIPT_CHARACTERS - headLength
  return {
    transcript: `${transcript.slice(0, headLength)}\n[Middle of transcript omitted for length]\n${transcript.slice(-tailLength)}`,
    wasTruncated: true
  }
}

async function collectSummaryResponse(
  model: inference.LLM,
  chatCtx: llm.ChatContext
) {
  const stream = model.chat({
    chatCtx,
    connOptions: {
      maxRetry: 1,
      retryIntervalMs: 1000,
      timeoutMs: 12_000
    }
  })
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    stream.close()
  }, SUMMARY_TIMEOUT_MS)
  let response = ''

  try {
    for await (const chunk of stream) {
      response += chunk.delta?.content ?? ''
    }
  } catch (error) {
    if (timedOut) throw new Error('Call summary generation timed out.')
    throw error
  } finally {
    clearTimeout(timeout)
    stream.close()
  }

  if (timedOut) throw new Error('Call summary generation timed out.')
  return response
}

export async function generateCallSummary({
  segments,
  modelName = DEFAULT_SUMMARY_MODEL
}: {
  segments: readonly TranscriptSegmentLike[]
  modelName?: string
}): Promise<CallSummary> {
  if (segments.length === 0) {
    throw new Error('A call summary requires at least one transcript segment.')
  }

  const source = truncateTranscript(transcriptForSummary(segments))
  const chatCtx = new llm.ChatContext()
  chatCtx.addMessage({
    role: 'system',
    content:
      'You create factual meeting summaries from speaker-attributed transcripts. Use only information explicitly present in the transcript. Do not invent decisions, action items, names, or context. Return only one valid JSON object with no markdown.'
  })
  chatCtx.addMessage({
    role: 'user',
    content: `Summarize this call for someone returning to the canvas later.

Return exactly this JSON shape:
{
  "title": "A specific 3-8 word call title",
  "overview": "A concise 2-4 sentence overview",
  "keyPoints": ["Up to 6 concrete discussion points"],
  "decisions": ["Only explicit decisions; otherwise an empty array"],
  "actionItems": [{ "text": "Only explicit follow-up work", "owner": "Named owner or null" }]
}

Transcript:
${source.transcript}`
  })

  const model = new inference.LLM({
    model: modelName,
    modelOptions: {
      temperature: 0.2,
      max_completion_tokens: 1200,
      response_format: { type: 'json_object' }
    }
  })

  try {
    const generated = parseGeneratedCallSummary(
      await collectSummaryResponse(model, chatCtx)
    )
    return callSummarySchema.parse({
      ...generated,
      model: modelName,
      generatedAt: new Date().toISOString(),
      sourceSegmentCount: segments.length,
      wasTruncated: source.wasTruncated
    })
  } finally {
    await model.aclose()
  }
}

export async function loadCallSummarySegments(
  supabase: Supabase,
  sessionId: string
) {
  const segments: TranscriptSegmentLike[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('canvas_call_transcript_segments')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true })
      .range(offset, offset + SEGMENT_PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Could not load transcript for summary: ${error.message}`)
    }

    const page = data ?? []
    segments.push(...page.map(segmentFromRow))
    if (page.length < SEGMENT_PAGE_SIZE) break
    offset += SEGMENT_PAGE_SIZE
  }

  return segments
}

async function saveSummaryArtifact({
  supabase,
  sessionId,
  canvasId,
  status,
  title,
  metadata
}: {
  supabase: Supabase
  sessionId: string
  canvasId: string
  status: 'ready' | 'failed'
  title: string
  metadata: Json
}) {
  const { error } = await supabase.from('canvas_call_artifacts').upsert(
    {
      session_id: sessionId,
      canvas_id: canvasId,
      kind: 'summary',
      status,
      title,
      metadata
    },
    { onConflict: 'session_id,kind' }
  )
  if (error) throw new Error(`Could not save call summary: ${error.message}`)
}

export async function createAndPersistCallSummary({
  supabase,
  sessionId,
  canvasId,
  modelName = DEFAULT_SUMMARY_MODEL,
  force = false
}: {
  supabase: Supabase
  sessionId: string
  canvasId: string
  modelName?: string
  force?: boolean
}) {
  if (!force) {
    const { data, error } = await supabase
      .from('canvas_call_artifacts')
      .select('status, metadata')
      .eq('session_id', sessionId)
      .eq('kind', 'summary')
      .maybeSingle()
    if (error) throw new Error(`Could not check call summary: ${error.message}`)
    if (
      data?.status === 'ready' &&
      callSummarySchema.safeParse(data.metadata).success
    ) {
      return { status: 'ready' as const, reused: true }
    }
  }

  const segments = await loadCallSummarySegments(supabase, sessionId)
  if (segments.length === 0) {
    return { status: 'skipped' as const, reused: false }
  }

  try {
    const summary = await generateCallSummary({ segments, modelName })
    await saveSummaryArtifact({
      supabase,
      sessionId,
      canvasId,
      status: 'ready',
      title: summary.title,
      metadata: summary as unknown as Json
    })
    return { status: 'ready' as const, reused: false, summary }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await saveSummaryArtifact({
      supabase,
      sessionId,
      canvasId,
      status: 'failed',
      title: 'Call summary',
      metadata: {
        errorMessage: message,
        model: modelName,
        generatedAt: new Date().toISOString(),
        sourceSegmentCount: segments.length
      }
    })
    throw error
  }
}
