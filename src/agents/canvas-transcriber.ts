import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  AutoSubscribe,
  ServerOptions,
  WorkerPermissions,
  cli,
  defineAgent,
  inference,
  stt,
  type JobContext
} from '@livekit/agents'
import {
  AudioStream,
  RemoteAudioTrack,
  RoomEvent,
  type AudioFrame,
  type RemoteParticipant,
  type RemoteTrackPublication
} from '@livekit/rtc-node'
import type { Database, Json } from '../lib/server/database.types'
import {
  loadTranscriptProgress,
  transcriptFailureMessage,
  transitionCallTranscript,
  type TranscriptErrorCode
} from '../lib/server/call-transcript-state'
import {
  createAndPersistCallSummary,
  DEFAULT_SUMMARY_MODEL
} from './call-summary'
import {
  createSerializedFinalizer,
  PendingTaskSet,
  resolveTranscriptOutcome,
  settleWithForcedClose,
  withTimeout
} from './transcript-lifecycle'

type DispatchMetadata = {
  canvasId: string
  callSessionId: string
  transcriptAttempt: number
  roomName: string
  enabledBy?: string
  model?: string
  language?: string
}

type ActiveTrack = {
  key: string
  participantIdentity: string
  stop: () => Promise<void>
}

type QueuedTrack = {
  track: RemoteAudioTrack
  publication: RemoteTrackPublication
  participant: RemoteParticipant
}

type WorkerFailure = {
  code: TranscriptErrorCode
  error: unknown
}

const AGENT_NAME = 'canvas-transcriber'
const DEFAULT_MODEL = 'deepgram/nova-3'
const DEFAULT_LANGUAGE = 'multi'
const SAMPLE_RATE = 16_000
const STT_FLUSH_TIMEOUT_MS = 6_000
const FINALIZATION_TIMEOUT_MS = 20_000

class TranscriptStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TranscriptStorageError'
  }
}

function loadEnvFiles() {
  const loadedKeys = new Set<string>()
  for (const file of ['.env', '.env.local', '.env.agent']) {
    if (!existsSync(file)) continue

    for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
      if (!match) continue

      const key = match[1]
      let value = match[2].trim()
      const quote = value[0]
      if (
        (quote === '"' || quote === "'") &&
        value.endsWith(quote) &&
        value.length >= 2
      ) {
        value = value.slice(1, -1)
      }

      if (process.env[key] === undefined || loadedKeys.has(key)) {
        process.env[key] = value
        loadedKeys.add(key)
      }
    }
  }
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function getSupabase() {
  return createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY')
  )
}

function parseDispatchMetadata(raw: string | undefined): DispatchMetadata {
  if (!raw) throw new Error('Transcriber dispatch metadata is missing.')

  const parsed = JSON.parse(raw) as Partial<DispatchMetadata>
  if (
    !parsed.canvasId ||
    !parsed.callSessionId ||
    !parsed.roomName ||
    !Number.isInteger(parsed.transcriptAttempt) ||
    (parsed.transcriptAttempt ?? 0) < 1
  ) {
    throw new Error('Transcriber dispatch metadata is incomplete.')
  }

  return {
    canvasId: parsed.canvasId,
    callSessionId: parsed.callSessionId,
    transcriptAttempt: parsed.transcriptAttempt!,
    roomName: parsed.roomName,
    enabledBy: parsed.enabledBy,
    model: parsed.model,
    language: parsed.language
  }
}

function metadataFromJob(ctx: JobContext) {
  return (
    (ctx.job as unknown as { metadata?: string }).metadata ||
    (ctx.info.job as unknown as { metadata?: string }).metadata ||
    ctx.info.acceptArguments.metadata
  )
}

function jobIdFromContext(ctx: JobContext) {
  return (
    (ctx.job as unknown as { id?: string }).id ||
    (ctx.info.job as unknown as { id?: string }).id ||
    null
  )
}

function jsonObject(value: Record<string, Json>): Json {
  return value
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default defineAgent({
  entry: async (ctx) => {
    const metadata = parseDispatchMetadata(metadataFromJob(ctx))
    const model =
      metadata.model || process.env.LIVEKIT_TRANSCRIPTION_MODEL || DEFAULT_MODEL
    const language =
      metadata.language ||
      process.env.LIVEKIT_TRANSCRIPTION_LANGUAGE ||
      DEFAULT_LANGUAGE
    const summaryModel =
      process.env.LIVEKIT_SUMMARY_MODEL || DEFAULT_SUMMARY_MODEL
    const supabase = getSupabase()
    const progress = await loadTranscriptProgress(
      supabase,
      metadata.callSessionId
    )

    let nextPosition = progress.nextPosition
    let segmentCount = progress.segmentCount
    let attemptSegmentCount = 0
    let receivedAudio = false
    let markedFirstSegment = false
    let activated = false
    let acceptingTracks = false
    let fatalFailure: WorkerFailure | null = null
    const activeTracks = new Map<string, ActiveTrack>()
    const queuedTracks = new Map<string, QueuedTrack>()
    const pendingTasks = new PendingTaskSet()

    console.info('Canvas transcriber received job', {
      jobId: jobIdFromContext(ctx),
      roomName: metadata.roomName,
      callSessionId: metadata.callSessionId,
      transcriptAttempt: metadata.transcriptAttempt,
      nextPosition,
      model,
      language
    })

    function requestFailure(code: TranscriptErrorCode, error: unknown) {
      if (fatalFailure) return
      fatalFailure = { code, error }
      console.error('Canvas transcriber failed', {
        code,
        error: errorText(error),
        callSessionId: metadata.callSessionId
      })
      ctx.shutdown(`transcription failed: ${code}`)
    }

    function trackKey(
      track: RemoteAudioTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) {
      return (
        track.sid ||
        publication.sid ||
        `${participant.identity}:${publication.name || 'audio'}`
      )
    }

    async function markDiagnostic(kind: 'first_audio' | 'first_segment') {
      const options = {
        supabase,
        sessionId: metadata.callSessionId,
        attempt: metadata.transcriptAttempt,
        segmentCount,
        markFirstAudio: kind === 'first_audio',
        markFirstSegment: kind === 'first_segment'
      }
      const appliedWhileActive = await transitionCallTranscript({
        ...options,
        status: 'active'
      })
      if (!appliedWhileActive) {
        await transitionCallTranscript({ ...options, status: 'processing' })
      }
    }

    function trackDiagnostic(task: Promise<void>) {
      void pendingTasks.track(task).catch((error) => {
        requestFailure(
          'worker_did_not_finalize',
          new TranscriptStorageError('Could not save transcript diagnostics.', {
            cause: error
          })
        )
      })
    }

    async function insertTranscriptSegment(
      participant: RemoteParticipant,
      data: stt.SpeechData
    ) {
      const text = data.text.trim()
      if (!text) return

      const position = nextPosition++
      const { error } = await supabase
        .from('canvas_call_transcript_segments')
        .insert({
          session_id: metadata.callSessionId,
          canvas_id: metadata.canvasId,
          position,
          speaker_identity: participant.identity,
          speaker_name: participant.name || participant.identity,
          speaker_sid: participant.sid ?? null,
          text,
          language: data.language ?? null,
          provider: 'livekit-inference',
          model,
          start_time_seconds: data.startTime ?? null,
          end_time_seconds: data.endTime ?? null,
          confidence: data.confidence ?? null,
          words: data.words ? (data.words as unknown as Json) : null,
          metadata: jsonObject({
            ...(data.speakerId ? { speaker_id: data.speakerId } : {}),
            ...(data.sourceLanguages
              ? { source_languages: data.sourceLanguages as unknown as Json }
              : {})
          })
        })

      if (error) {
        throw new TranscriptStorageError(
          `Could not insert transcript segment: ${error.message}`,
          { cause: error }
        )
      }

      segmentCount += 1
      attemptSegmentCount += 1
      if (!markedFirstSegment) {
        markedFirstSegment = true
        await markDiagnostic('first_segment')
      }

      console.info('Canvas transcriber inserted segment', {
        callSessionId: metadata.callSessionId,
        speakerIdentity: participant.identity,
        position,
        characters: text.length
      })
    }

    function startTrack(
      track: RemoteAudioTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) {
      const key = trackKey(track, publication, participant)
      if (activeTracks.has(key)) return

      const audioStream = new AudioStream(track, {
        sampleRate: SAMPLE_RATE,
        numChannels: 1,
        frameSizeMs: 100
      })
      const sttClient = new inference.STT({
        model,
        language,
        sampleRate: SAMPLE_RATE,
        modelOptions: {
          interim_results: false,
          punctuate: true,
          smart_format: true
        }
      })
      sttClient.on('error', ({ error }) => requestFailure('stt_failed', error))
      const recognizer = sttClient.stream({ language })
      let reader: ReadableStreamDefaultReader<AudioFrame> | null = null
      let stopping = false
      let inputEnded = false
      let stopPromise: Promise<void> | null = null

      function endInput() {
        if (inputEnded) return
        inputEnded = true
        recognizer.endInput()
      }

      const audioTask = (async () => {
        const currentReader = audioStream.getReader()
        reader = currentReader
        try {
          while (!stopping) {
            const { done, value } = await currentReader.read()
            if (done) break
            if (!receivedAudio) {
              receivedAudio = true
              trackDiagnostic(markDiagnostic('first_audio'))
            }
            recognizer.pushFrame(value)
          }
        } catch (error) {
          if (!stopping) requestFailure('stt_failed', error)
        } finally {
          if (reader === currentReader) reader = null
          currentReader.releaseLock()
          if (!inputEnded) endInput()
        }
      })()

      const transcriptTask = (async () => {
        try {
          for await (const event of recognizer) {
            if (event.type !== stt.SpeechEventType.FINAL_TRANSCRIPT) continue
            const data = event.alternatives?.[0]
            if (data) await insertTranscriptSegment(participant, data)
          }
        } catch (error) {
          requestFailure(
            error instanceof TranscriptStorageError
              ? 'worker_did_not_finalize'
              : 'stt_failed',
            error
          )
        }
      })()

      const active: ActiveTrack = {
        key,
        participantIdentity: participant.identity,
        stop: () => {
          stopPromise ??= (async () => {
            stopping = true
            await reader?.cancel().catch(() => {})
            try {
              await withTimeout(
                audioTask,
                STT_FLUSH_TIMEOUT_MS,
                () => new Error('Timed out while stopping the audio stream.')
              )
              if (!inputEnded) endInput()
              const forcedClose = await settleWithForcedClose({
                task: transcriptTask,
                timeoutMs: STT_FLUSH_TIMEOUT_MS,
                forceClose: () => recognizer.close()
              })
              if (forcedClose) {
                console.warn(
                  'STT stream remained open after final input; closing it locally',
                  {
                    callSessionId: metadata.callSessionId,
                    participantIdentity: participant.identity
                  }
                )
              }
            } finally {
              recognizer.close()
              sttClient.removeAllListeners('error')
            }
          })()
          return stopPromise
        }
      }

      activeTracks.set(key, active)
    }

    async function stopTrack(key: string) {
      const active = activeTracks.get(key)
      if (!active) return
      try {
        await active.stop()
      } finally {
        activeTracks.delete(key)
      }
    }

    async function stopParticipantTracks(participant: RemoteParticipant) {
      const keys = [...activeTracks.values()]
        .filter((active) => active.participantIdentity === participant.identity)
        .map((active) => active.key)
      await Promise.all(keys.map(stopTrack))
    }

    function stopInBackground(task: Promise<void>) {
      void pendingTasks.track(task).catch((error) => {
        requestFailure('finalization_timeout', error)
      })
    }

    function queueOrStartTrack(
      track: RemoteAudioTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) {
      const key = trackKey(track, publication, participant)
      if (!acceptingTracks) {
        queuedTracks.set(key, { track, publication, participant })
        return
      }
      try {
        startTrack(track, publication, participant)
      } catch (error) {
        requestFailure('stt_failed', error)
      }
    }

    const finalize = createSerializedFinalizer(async () => {
      acceptingTracks = false
      queuedTracks.clear()

      try {
        await withTimeout(
          Promise.all([...activeTracks.keys()].map(stopTrack)),
          FINALIZATION_TIMEOUT_MS,
          () => new Error('Timed out while stopping transcription tracks.')
        )
        await withTimeout(
          pendingTasks.drain(),
          FINALIZATION_TIMEOUT_MS,
          () => new Error('Timed out while saving pending transcript events.')
        )
      } catch (error) {
        if (!fatalFailure) {
          fatalFailure = { code: 'finalization_timeout', error }
        }
        console.error('Canvas transcriber finalization timed out', {
          error: errorText(error),
          callSessionId: metadata.callSessionId
        })
      }

      if (!activated) return

      const enteredProcessing = await transitionCallTranscript({
        supabase,
        sessionId: metadata.callSessionId,
        attempt: metadata.transcriptAttempt,
        status: 'processing',
        segmentCount
      })
      if (!enteredProcessing) {
        console.warn(
          'Transcript attempt was already terminal during finalization',
          {
            callSessionId: metadata.callSessionId,
            transcriptAttempt: metadata.transcriptAttempt
          }
        )
        return
      }

      const outcome = resolveTranscriptOutcome({
        failureCode: fatalFailure?.code ?? null,
        receivedAudio,
        attemptSegmentCount,
        segmentCount
      })

      if (outcome.status === 'no_speech') {
        await transitionCallTranscript({
          supabase,
          sessionId: metadata.callSessionId,
          attempt: metadata.transcriptAttempt,
          status: 'no_speech',
          errorCode: outcome.errorCode,
          segmentCount,
          markCompleted: true
        })
        console.info('Canvas transcriber completed without speech', {
          callSessionId: metadata.callSessionId,
          transcriptAttempt: metadata.transcriptAttempt,
          diagnosticCode: outcome.errorCode
        })
        return
      }

      if (outcome.status === 'failed') {
        await transitionCallTranscript({
          supabase,
          sessionId: metadata.callSessionId,
          attempt: metadata.transcriptAttempt,
          status: 'failed',
          errorCode: outcome.errorCode,
          errorMessage: transcriptFailureMessage(outcome.errorCode),
          segmentCount,
          markCompleted: true
        })
        return
      }

      try {
        const summaryResult = await createAndPersistCallSummary({
          supabase,
          sessionId: metadata.callSessionId,
          canvasId: metadata.canvasId,
          modelName: summaryModel
        })
        console.info('Canvas transcriber finalized call summary', {
          callSessionId: metadata.callSessionId,
          summaryStatus: summaryResult.status,
          reused: summaryResult.reused
        })
      } catch (error) {
        console.error('Canvas transcriber could not generate call summary', {
          callSessionId: metadata.callSessionId,
          error: errorText(error)
        })
      }

      await transitionCallTranscript({
        supabase,
        sessionId: metadata.callSessionId,
        attempt: metadata.transcriptAttempt,
        status: 'ready',
        segmentCount,
        markCompleted: true
      })
      console.info('Canvas transcriber finalized transcript', {
        callSessionId: metadata.callSessionId,
        transcriptAttempt: metadata.transcriptAttempt,
        segmentCount
      })
    })

    ctx.addShutdownCallback(finalize)
    ctx.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        if (track instanceof RemoteAudioTrack) {
          queueOrStartTrack(track, publication, participant)
        }
      }
    )
    ctx.room.on(
      RoomEvent.TrackUnsubscribed,
      (track, publication, participant) => {
        if (!(track instanceof RemoteAudioTrack)) return
        const key = trackKey(track, publication, participant)
        queuedTracks.delete(key)
        stopInBackground(stopTrack(key))
      }
    )
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      stopInBackground(stopParticipantTracks(participant))
    })
    ctx.room.on(RoomEvent.Disconnected, () => {
      void finalize().catch((error) =>
        console.error('Canvas transcriber could not finalize', error)
      )
    })

    try {
      await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY)
    } catch (error) {
      const code = 'agent_connect_failed' as const
      await transitionCallTranscript({
        supabase,
        sessionId: metadata.callSessionId,
        attempt: metadata.transcriptAttempt,
        status: 'failed',
        errorCode: code,
        errorMessage: transcriptFailureMessage(code),
        segmentCount,
        markCompleted: true
      }).catch((transitionError) =>
        console.error(
          'Could not persist agent connection failure',
          transitionError
        )
      )
      throw error
    }

    activated = await transitionCallTranscript({
      supabase,
      sessionId: metadata.callSessionId,
      attempt: metadata.transcriptAttempt,
      status: 'active',
      agentJobId: jobIdFromContext(ctx),
      segmentCount,
      markAccepted: true
    })
    if (!activated) {
      ctx.shutdown('transcript attempt is no longer active')
      return
    }

    acceptingTracks = true
    for (const participant of ctx.room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        const track = publication.track
        if (track instanceof RemoteAudioTrack) {
          queueOrStartTrack(track, publication, participant)
        }
      }
    }
    for (const queued of queuedTracks.values()) {
      queueOrStartTrack(queued.track, queued.publication, queued.participant)
    }
    queuedTracks.clear()

    console.info('Canvas transcriber connected and active', {
      jobId: jobIdFromContext(ctx),
      callSessionId: metadata.callSessionId,
      transcriptAttempt: metadata.transcriptAttempt
    })
  }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadEnvFiles()
  cli.runApp(
    new ServerOptions({
      agent: fileURLToPath(import.meta.url),
      agentName: AGENT_NAME,
      shutdownProcessTimeout: 45_000,
      permissions: new WorkerPermissions(false, true, false, false, [], true)
    })
  )
}
