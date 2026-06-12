import type { Corner, DevicePrefs, Point, Size } from '$lib/conference/types'

// Anchor geometry mirrors the fixed chrome it has to coexist with:
// right-6/bottom-6 margins (24px), the top-6 toolbars (h-9/h-10 -> 80px
// clearance), the bottom-right zoom column (w-10) and the chat window
// (h-[min(35rem,calc(100vh-6rem))] at bottom-6 right-6).
export const PIP_MARGIN = 24
export const PIP_TOP_MARGIN = 80
export const PIP_GAP = 12
const ZOOM_STACK_WIDTH = 40
const CHAT_MAX_HEIGHT = 560
const CHAT_VIEWPORT_INSET = 96

export function nearestCorner(center: Point, viewport: Size): Corner {
  const left = center.x < viewport.width / 2
  const top = center.y < viewport.height / 2
  if (top) {
    return left ? 'top-left' : 'top-right'
  }
  return left ? 'bottom-left' : 'bottom-right'
}

export function anchorFor(
  corner: Corner,
  pip: Size,
  viewport: Size,
  chatOpen: boolean
): Point {
  switch (corner) {
    case 'top-left':
      return { x: PIP_MARGIN, y: PIP_TOP_MARGIN }
    case 'top-right':
      return { x: viewport.width - pip.width - PIP_MARGIN, y: PIP_TOP_MARGIN }
    case 'bottom-left':
      return { x: PIP_MARGIN, y: viewport.height - pip.height - PIP_MARGIN }
    case 'bottom-right': {
      if (chatOpen) {
        const chatHeight = Math.min(
          CHAT_MAX_HEIGHT,
          viewport.height - CHAT_VIEWPORT_INSET
        )
        return {
          x: viewport.width - pip.width - PIP_MARGIN,
          // Clamp on short viewports: overlapping the chat top beats
          // pushing the box off-screen.
          y: Math.max(
            PIP_TOP_MARGIN,
            viewport.height - PIP_MARGIN - chatHeight - PIP_GAP - pip.height
          )
        }
      }
      // Nudged left of the zoom column so zoom and the chat launcher stay
      // clickable while the box rests in this corner.
      return {
        x: viewport.width - pip.width - PIP_MARGIN - ZOOM_STACK_WIDTH - PIP_GAP,
        y: viewport.height - pip.height - PIP_MARGIN
      }
    }
  }
}

export function clampToViewport(point: Point, pip: Size, viewport: Size): Point {
  return {
    x: Math.min(Math.max(point.x, 0), Math.max(viewport.width - pip.width, 0)),
    y: Math.min(Math.max(point.y, 0), Math.max(viewport.height - pip.height, 0))
  }
}

type Featurable = { identity: string; isLocal: boolean }

// Meet-style featured tile: an explicit pin wins, otherwise the last remote
// participant who spoke stays featured (sticky, no flicker between words),
// falling back to self when alone or the speaker left.
export function pickFeatured<T extends Featurable>(
  participants: readonly T[],
  pinnedIdentity: string | null,
  lastRemoteSpeakerIdentity: string | null
): T | null {
  if (pinnedIdentity) {
    const pinned = participants.find((p) => p.identity === pinnedIdentity)
    if (pinned) {
      return pinned
    }
  }
  if (lastRemoteSpeakerIdentity) {
    const speaker = participants.find(
      (p) => p.identity === lastRemoteSpeakerIdentity
    )
    if (speaker) {
      return speaker
    }
  }
  return participants.find((p) => p.isLocal) ?? null
}

const DEVICE_PREFS_KEY = 'canvas-conference-devices'

export function loadDevicePrefs(): DevicePrefs {
  if (typeof localStorage === 'undefined') {
    return {}
  }
  try {
    const raw = localStorage.getItem(DEVICE_PREFS_KEY)
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return {}
    }
    const prefs: DevicePrefs = {}
    for (const kind of ['videoinput', 'audioinput', 'audiooutput'] as const) {
      const value = (parsed as Record<string, unknown>)[kind]
      if (typeof value === 'string') {
        prefs[kind] = value
      }
    }
    return prefs
  } catch {
    return {}
  }
}

export function saveDevicePrefs(prefs: DevicePrefs) {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(DEVICE_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage being unavailable (private mode, quota) only loses the
    // preference, never the call.
  }
}
