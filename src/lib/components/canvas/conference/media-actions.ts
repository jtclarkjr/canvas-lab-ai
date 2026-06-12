import type { AudioTrack, VideoTrack } from 'livekit-client'

type AttachableTrack = AudioTrack | VideoTrack | null

// Svelte action: keeps a LiveKit track attached to a media element across
// track swaps (camera switch, republish after reconnect).
export function attachTrack(node: HTMLMediaElement, track: AttachableTrack) {
  let current: AttachableTrack = null

  const set = (next: AttachableTrack) => {
    if (current === next) {
      return
    }
    current?.detach(node)
    current = next
    current?.attach(node)
  }

  set(track)

  return {
    update: set,
    destroy() {
      current?.detach(node)
      current = null
    }
  }
}
