import type { AudioTrack, VideoTrack } from 'livekit-client'

// Schema-inferred types (token/status responses) stay in
// $lib/conference/schema next to their zod schemas.

// PiP geometry
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type Point = { x: number; y: number }
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
  color: string
  videoTrack: VideoTrack | null
  audioTrack: AudioTrack | null
}
