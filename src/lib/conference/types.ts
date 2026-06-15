import type { AudioTrack, VideoTrack } from 'livekit-client'

// Schema-inferred types (token/status responses) stay in
// $lib/conference/schema next to their zod schemas.

// PiP geometry
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type Size = { width: number; height: number }

// Device selection
export type DeviceKind = 'videoinput' | 'audioinput' | 'audiooutput'
export type DevicePrefs = Partial<Record<DeviceKind, string>>

export type ConferenceDevices = {
  cameras: MediaDeviceInfo[]
  mics: MediaDeviceInfo[]
  speakers: MediaDeviceInfo[]
}

// Call state
export type ConferenceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

export type ConferenceViewMode = 'pip' | 'bar' | 'fullscreen'

export type ConferenceFullscreenPanel = 'none' | 'chat' | 'people'

export type ConferenceFullscreenChatTab = 'call' | 'canvas'

export type ConferenceLayoutMode = 'auto' | 'spotlight' | 'sidebar'

// Reactive snapshot of a LiveKit participant (the live Room object itself
// is never exposed to the UI).
export type ConferenceParticipant = {
  identity: string
  sid: string
  name: string
  isLocal: boolean
  isSpeaking: boolean
  micEnabled: boolean
  camEnabled: boolean
  // Mirrors the participant's `captions` attribute: when anyone in the
  // room wants captions, every unmuted participant transcribes their mic.
  wantsCaptions: boolean
  color: string
  videoTrack: VideoTrack | null
  screenShareTrack: VideoTrack | null
  audioTrack: AudioTrack | null
}

// One rendered caption line. `text` is the speaker's original language;
// `translated` is filled in per-viewer once a final segment is translated.
export type CaptionSegment = {
  id: string
  speakerIdentity: string
  speakerName: string
  speakerColor: string
  text: string
  translated: string | null
  final: boolean
  receivedAt: number
}

// Background effects
export type BackgroundEffect = 'none' | 'blur' | 'virtual'

export type BgPreset =
  | { id: string; label: string; type: 'none' | 'blur' }
  | { id: string; label: string; type: 'virtual'; imagePath: string }

export type BgPrefs = {
  effect: BackgroundEffect
  imagePath: string | null
  blurRadius: number
}

// Data channel text streams
export type ConferenceTextStream = {
  topic: string
  text: string
  streamId: string
  timestamp: number
  attributes: Record<string, string>
  participantIdentity: string | undefined
}

// Call-scoped chat
export type ConferenceCallChatAuthor = {
  id: string
  name: string
  color: string
}

export type ConferenceCallChatMessage = {
  id: string
  content: string
  author: ConferenceCallChatAuthor
  createdBy: string | null
  createdAt: string
}

export type ConferenceCallChatEntryStatus = 'sent' | 'pending' | 'failed'

export type ConferenceCallChatEntry = {
  message: ConferenceCallChatMessage
  status: ConferenceCallChatEntryStatus
  errorMessage?: string
}
