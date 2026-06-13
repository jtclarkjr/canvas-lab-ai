import { z } from 'zod'

// LiveKit data-channel topic caption segments travel on. Each speaker
// transcribes their own microphone and publishes segments; every receiver
// renders (and translates) them locally.
export const CAPTIONS_DATA_TOPIC = 'captions'

const GPT_4O_MINI_TRANSCRIBE = 'gpt-4o-mini-transcribe'
const GPT_REALTIME_WHISPER = 'gpt-realtime-whisper'
const WHISPER_1 = 'whisper-1'

// Transcription models in preference order. gpt-4o-mini-transcribe is
// proven to stream deltas over WebRTC with server VAD; the others are
// fallbacks for accounts where it is unavailable. The token endpoint tries
// them in order and returns the one that worked.
export const CAPTIONS_TRANSCRIBE_MODELS = [
  GPT_4O_MINI_TRANSCRIBE,
  GPT_REALTIME_WHISPER,
  WHISPER_1
] as const

// The transcription config sent in the client secret AND re-asserted over
// the data channel once connected — the WebRTC call does not reliably
// inherit the secret's session config without the explicit update.
export function captionsSessionConfig(model: string) {
  const input: Record<string, unknown> = {
    noise_reduction: { type: 'near_field' },
    transcription: { model }
  }
  // gpt-realtime-whisper segments speech continuously on its own and
  // rejects turn_detection config with a 400 (invalid_value).
  if (model !== GPT_REALTIME_WHISPER) {
    input.turn_detection = { type: 'server_vad' }
  }
  return {
    type: 'transcription' as const,
    audio: { input }
  }
}

export const CAPTION_LANGUAGE_CODES = [
  'en',
  'ja',
  'es',
  'fr',
  'de',
  'ko',
  'zh'
] as const

export type CaptionLanguageCode = (typeof CAPTION_LANGUAGE_CODES)[number]

// Order is the picker order: English first, Japanese second by request.
export const CAPTION_LANGUAGES: Array<{
  code: CaptionLanguageCode
  label: string
}> = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' }
]

export function captionLanguageLabel(code: CaptionLanguageCode) {
  return CAPTION_LANGUAGES.find((entry) => entry.code === code)?.label ?? code
}

export const CAPTION_TEXT_SIZE_CODES = ['small', 'medium', 'large'] as const
export type CaptionTextSize = (typeof CAPTION_TEXT_SIZE_CODES)[number]

export const DEFAULT_CAPTION_TEXT_SIZE: CaptionTextSize = 'medium'

export const CAPTION_TEXT_SIZES: Array<{
  code: CaptionTextSize
  label: string
}> = [
  { code: 'small', label: 'Small' },
  { code: 'medium', label: 'Medium' },
  { code: 'large', label: 'Large' }
]

export const CAPTION_TEXT_COLOR_CODES = [
  'theme',
  'white',
  'yellow',
  'cyan',
  'green'
] as const
export type CaptionTextColor = (typeof CAPTION_TEXT_COLOR_CODES)[number]

export const DEFAULT_CAPTION_TEXT_COLOR: CaptionTextColor = 'theme'

export const CAPTION_TEXT_COLORS: Array<{
  code: CaptionTextColor
  label: string
  value: string
}> = [
  { code: 'theme', label: 'Theme', value: 'var(--popover-foreground)' },
  { code: 'white', label: 'White', value: '#ffffff' },
  { code: 'yellow', label: 'Yellow', value: '#fde047' },
  { code: 'cyan', label: 'Cyan', value: '#67e8f9' },
  { code: 'green', label: 'Green', value: '#86efac' }
]

export function captionTextColorValue(code: CaptionTextColor) {
  return (
    CAPTION_TEXT_COLORS.find((entry) => entry.code === code)?.value ??
    CAPTION_TEXT_COLORS[0].value
  )
}

// Wire format of a caption data message. Deltas re-use the segment id so
// receivers update the segment in place; `final` marks the authoritative
// text for a segment.
export const captionDataSchema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  text: z.string(),
  final: z.boolean()
})

export type CaptionData = z.infer<typeof captionDataSchema>

const CAPTION_PREFS_KEY = 'canvas-conference-captions'

export type CaptionPrefs = {
  language?: CaptionLanguageCode
}

export function loadCaptionPrefs(): CaptionPrefs {
  if (typeof localStorage === 'undefined') {
    return {}
  }
  try {
    const raw = localStorage.getItem(CAPTION_PREFS_KEY)
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return {}
    }
    const language = (parsed as Record<string, unknown>).language
    if (
      typeof language === 'string' &&
      (CAPTION_LANGUAGE_CODES as readonly string[]).includes(language)
    ) {
      return { language: language as CaptionLanguageCode }
    }
    return {}
  } catch {
    return {}
  }
}

export function saveCaptionPrefs(prefs: CaptionPrefs) {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(CAPTION_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage being unavailable only loses the preference.
  }
}
