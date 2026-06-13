import { ApiClientError } from '$lib/api-client'
import { fetchCaptionsToken, translateCaption } from '$lib/conference/api'
import {
  CAPTIONS_DATA_TOPIC,
  captionDataSchema,
  captionsSessionConfig,
  DEFAULT_CAPTION_TEXT_COLOR,
  DEFAULT_CAPTION_TEXT_SIZE,
  loadCaptionPrefs,
  saveCaptionPrefs,
  type CaptionLanguageCode,
  type CaptionTextColor,
  type CaptionTextSize
} from '$lib/conference/captions'
import { OPENAI_REALTIME_CALLS_URL } from '$lib/conference/openai-realtime'
import type { CaptionSegment } from '$lib/conference/types'
import { toast } from '$lib/stores/shared/toast.svelte'
import type { ConferenceDevicesStore } from '$lib/stores/conference/devices.svelte'
import type { ConferenceRoomStore } from '$lib/stores/conference/room.svelte'

type ConferenceCaptionsInput = {
  getCanvasId: () => string
  getEnabled: () => boolean
  room: ConferenceRoomStore
  devices: ConferenceDevicesStore
}

const MAX_SEGMENTS = 24

type SttState = 'off' | 'connecting' | 'running' | 'error'

// Live captions. Each participant transcribes their OWN microphone against
// OpenAI's realtime transcription API (browser connects directly with a
// server-minted ephemeral secret) and publishes segments on a LiveKit data
// topic. Transcription runs whenever ANYONE in the room has captions on,
// so every viewer gets every speaker. Translation happens per-viewer.
export function createConferenceCaptionsStore({
  getCanvasId,
  getEnabled,
  room,
  devices
}: ConferenceCaptionsInput) {
  const prefs = loadCaptionPrefs()
  let enabled = $state(false)
  let language = $state<CaptionLanguageCode>(prefs.language ?? 'en')
  let textSize = $state<CaptionTextSize>(DEFAULT_CAPTION_TEXT_SIZE)
  let textColor = $state<CaptionTextColor>(DEFAULT_CAPTION_TEXT_COLOR)
  let segments = $state.raw<CaptionSegment[]>([])
  let sttState = $state<SttState>('off')

  // Non-reactive session internals (mirrors the Room-in-closure rule).
  let pc: RTCPeerConnection | null = null
  let captureTrack: MediaStreamTrack | null = null
  let generation = 0
  // undefined = no session wanted; otherwise the audio input device the
  // running/starting session was built for.
  let sessionDevice: string | null | undefined = undefined
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let connectWatchdog: ReturnType<typeof setTimeout> | null = null
  let warnedThisCall = false

  const translationCache = new Map<string, string>()
  // Items that produced whisper-style segment events: their `completed`
  // event repeats the full transcript and must not render twice.
  const segmentedItems = new Set<string>()

  const someoneWantsCaptions = $derived(
    enabled || room.participants.some((p) => !p.isLocal && p.wantsCaptions)
  )
  const shouldTranscribe = $derived(
    room.isInCall && someoneWantsCaptions && room.micEnabled && devices.hasMic
  )

  function stopSession() {
    generation += 1
    sessionDevice = undefined
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    if (connectWatchdog) {
      clearTimeout(connectWatchdog)
      connectWatchdog = null
    }
    captureTrack?.stop()
    captureTrack = null
    pc?.close()
    pc = null
    segmentedItems.clear()
    sttState = 'off'
  }

  function failSession(error: unknown) {
    stopSession()
    sttState = 'error'
    if (!warnedThisCall) {
      warnedThisCall = true
      toast.show({
        title: 'Captions unavailable',
        description:
          error instanceof ApiClientError
            ? error.message
            : 'The transcription service could not be reached.',
        variant: 'error'
      })
    }
  }

  function scheduleRetry() {
    if (retryTimer) {
      return
    }
    retryTimer = setTimeout(() => {
      retryTimer = null
      if (shouldTranscribe && sessionDevice === undefined) {
        void ensureSession(devices.activeDeviceIds.audioinput ?? null)
      }
    }, 2000)
  }

  async function ensureSession(device: string | null) {
    if (sessionDevice !== undefined && sessionDevice === device) {
      return
    }
    stopSession()
    sessionDevice = device
    const generationAtStart = (generation += 1)
    sttState = 'connecting'

    try {
      // A dedicated capture for the transcription leg: cloning the call's
      // published mic track silently produces no audio when the clone is
      // consumed by a second peer connection in some browsers (Safari).
      // Permission is already granted, so this never prompts.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: device ? { deviceId: device } : true
      })
      const track = stream.getAudioTracks()[0]
      if (!track) {
        throw new Error('No microphone available for captions.')
      }
      if (generation !== generationAtStart) {
        track.stop()
        return
      }

      const { clientSecret, model } = await fetchCaptionsToken(getCanvasId())
      if (generation !== generationAtStart) {
        track.stop()
        return
      }

      const connection = new RTCPeerConnection()
      // Plain addTrack, exactly like OpenAI's documented browser flow — a
      // sendonly transceiver can be negotiated inactive by their answerer,
      // leaving a working data channel but no audio.
      connection.addTrack(track, stream)

      const channel = connection.createDataChannel('oai-events')
      channel.onopen = () => {
        if (generation !== generationAtStart) {
          return
        }
        // Re-assert the transcription config: the WebRTC call does not
        // reliably inherit the session bound to the ephemeral secret, and
        // without it the session connects but never emits transcripts.
        channel.send(
          JSON.stringify({
            type: 'session.update',
            session: captionsSessionConfig(model)
          })
        )
        if (connectWatchdog) {
          clearTimeout(connectWatchdog)
          connectWatchdog = null
        }
        sttState = 'running'
      }
      channel.onmessage = (event) => {
        if (generation === generationAtStart) {
          handleRealtimeEvent(event.data)
        }
      }
      channel.onclose = () => {
        // Unexpected drop (network blip, session expiry): try once more
        // while captions are still wanted.
        if (generation === generationAtStart) {
          stopSession()
          scheduleRetry()
        }
      }
      connection.onconnectionstatechange = () => {
        if (generation !== generationAtStart) {
          return
        }
        const state = connection.connectionState
        if (
          state === 'failed' ||
          state === 'closed' ||
          state === 'disconnected'
        ) {
          stopSession()
          scheduleRetry()
        }
      }

      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)

      const response = await fetch(OPENAI_REALTIME_CALLS_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${clientSecret}`,
          'content-type': 'application/sdp'
        },
        body: offer.sdp
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        console.warn('[captions] SDP exchange failed', response.status, detail)
        throw new Error('The transcription service rejected the session.')
      }
      const answer = await response.text()

      if (generation !== generationAtStart) {
        track.stop()
        connection.close()
        return
      }

      await connection.setRemoteDescription({ type: 'answer', sdp: answer })
      pc = connection
      captureTrack = track

      // If the event channel never opens, fail visibly instead of sitting
      // on a silent spinner forever.
      connectWatchdog = setTimeout(() => {
        connectWatchdog = null
        if (generation === generationAtStart && sttState === 'connecting') {
          failSession(new Error('Timed out starting captions.'))
        }
      }, 10_000)
    } catch (error) {
      if (generation !== generationAtStart) {
        return
      }
      failSession(error)
    }
  }

  function handleRealtimeEvent(raw: unknown) {
    if (typeof raw !== 'string') {
      return
    }
    let event: {
      type?: string
      item_id?: string
      id?: string
      delta?: string
      transcript?: string
      text?: string
      error?: unknown
    }
    try {
      event = JSON.parse(raw) as typeof event
    } catch {
      return
    }

    if (event.type === 'error') {
      // Session-level failure (bad config, expired session): bail and
      // retry once rather than sitting silent.
      console.warn('[captions] realtime error event', event.error ?? event)
      stopSession()
      scheduleRetry()
      return
    }
    if (event.type === 'conversation.item.input_audio_transcription.failed') {
      // Per-utterance failure: skip the segment, keep the session.
      console.warn('[captions] transcription failed for an utterance', event)
      return
    }
    if (!event.item_id) {
      return
    }

    // Only finalized utterances render (viewers see captions exclusively in
    // their target language, so there is no interim text to show) — interim
    // delta events are intentionally ignored.
    if (
      event.type === 'conversation.item.input_audio_transcription.segment' &&
      typeof event.text === 'string'
    ) {
      // Whisper-family models stream stable, final chunks as segments
      // instead of deltas.
      segmentedItems.add(event.item_id)
      emitOwnSegment(
        `${event.item_id}:${event.id ?? segmentedItems.size}`,
        event.text
      )
    } else if (
      event.type === 'conversation.item.input_audio_transcription.completed' &&
      typeof event.transcript === 'string'
    ) {
      // Segmented items already rendered this text chunk by chunk.
      if (segmentedItems.has(event.item_id)) {
        segmentedItems.delete(event.item_id)
        return
      }
      emitOwnSegment(event.item_id, event.transcript)
    }
  }

  function emitOwnSegment(id: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }

    room.publishData(CAPTIONS_DATA_TOPIC, {
      v: 1,
      id,
      text: trimmed,
      final: true
    })

    // publishData does not loop back to the sender, so ingest locally too.
    if (enabled) {
      const local = room.participants.find((p) => p.isLocal)
      ingestSegment({
        id,
        speakerIdentity: local?.identity ?? 'me',
        speakerName: 'You',
        speakerColor: local?.color ?? 'var(--color-primary)',
        text: trimmed
      })
    }
  }

  function handleData(
    payload: Uint8Array,
    participantIdentity: string | undefined,
    topic: string | undefined
  ) {
    if (topic !== CAPTIONS_DATA_TOPIC || !enabled) {
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(new TextDecoder().decode(payload))
    } catch {
      return
    }
    const data = captionDataSchema.safeParse(parsed)
    if (!data.success || !data.data.final) {
      return
    }

    const speaker = room.participants.find(
      (p) => p.identity === participantIdentity
    )
    ingestSegment({
      id: `${participantIdentity ?? 'unknown'}:${data.data.id}`,
      speakerIdentity: participantIdentity ?? 'unknown',
      speakerName: speaker?.name ?? 'Someone',
      speakerColor: speaker?.color ?? 'var(--color-muted-foreground)',
      text: data.data.text
    })
  }

  function ingestSegment(input: {
    id: string
    speakerIdentity: string
    speakerName: string
    speakerColor: string
    text: string
  }) {
    const existing = segments.find((segment) => segment.id === input.id)
    const next: CaptionSegment = {
      ...input,
      final: true,
      translated: existing?.translated ?? null,
      receivedAt: Date.now()
    }
    segments = [
      ...segments.filter((segment) => segment.id !== input.id),
      next
    ].slice(-MAX_SEGMENTS)

    void translateSegment(next.id, input.text)
  }

  // Per-viewer translation into the picked language. The model returns the
  // text unchanged when it is already in that language. Lines only render
  // once `translated` is set, so originals never flash in another language;
  // a failed translation falls back to the original text.
  async function translateSegment(id: string, text: string) {
    const target = language
    const cacheKey = `${target}:${id}`
    const cached = translationCache.get(cacheKey)
    if (cached !== undefined) {
      applyTranslation(id, target, cached)
      return
    }
    try {
      const response = await translateCaption(getCanvasId(), text, target)
      translationCache.set(cacheKey, response.text)
      applyTranslation(id, target, response.text)
    } catch {
      applyTranslation(id, target, text)
    }
  }

  function applyTranslation(
    id: string,
    target: CaptionLanguageCode,
    text: string
  ) {
    if (language !== target) {
      return
    }
    segments = segments.map((segment) =>
      segment.id === id ? { ...segment, translated: text } : segment
    )
  }

  // Start/stop the transcription leg. Reading the derived booleans keeps
  // this stable: it only re-runs when they flip or the mic device changes.
  $effect(() => {
    if (!getEnabled()) {
      return
    }
    const want = shouldTranscribe
    const device = devices.activeDeviceIds.audioinput ?? null
    if (!want) {
      stopSession()
      return
    }
    void ensureSession(device)
  })

  // Advertise my captions preference so other participants start
  // transcribing their mics for me (and vice versa).
  $effect(() => {
    if (!room.isInCall) {
      return
    }
    void room.setLocalAttributes({ captions: enabled ? 'on' : 'off' })
  })

  // Call ended: clear transcripts (they are ephemeral by design) and let
  // the next call warn fresh. The language preference persists.
  $effect(() => {
    if (room.status === 'idle') {
      stopSession()
      segments = []
      translationCache.clear()
      warnedThisCall = false
      enabled = false
    }
  })

  $effect(() => {
    return () => stopSession()
  })

  return {
    get enabled() {
      return enabled
    },
    get language() {
      return language
    },
    get textSize() {
      return textSize
    },
    get textColor() {
      return textColor
    },
    get segments() {
      return segments
    },
    get sttState() {
      return sttState
    },
    toggle() {
      enabled = !enabled
      if (enabled && sttState === 'error') {
        sttState = 'off'
      }
    },
    setLanguage(code: CaptionLanguageCode) {
      if (code === language) {
        return
      }
      language = code
      saveCaptionPrefs({ language: code })
      // Old translations are for the old language; show originals until
      // fresh finals arrive (and re-translate the visible finals).
      segments = segments.map((segment) => ({ ...segment, translated: null }))
      for (const segment of segments.slice(-4)) {
        if (segment.final) {
          void translateSegment(segment.id, segment.text)
        }
      }
    },
    setTextSize(size: CaptionTextSize) {
      textSize = size
    },
    setTextColor(color: CaptionTextColor) {
      textColor = color
    },
    handleData
  }
}

export type ConferenceCaptionsStore = ReturnType<
  typeof createConferenceCaptionsStore
>
