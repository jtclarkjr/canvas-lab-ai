import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '$lib/auth/session-store'
import { fetchConferenceStatus } from '$lib/conference/api'
import { conferenceChannelName } from '$lib/conference/schema'

type ConferenceStatusInput = {
  getCanvasId: () => string
  getEnabled: () => boolean
  // Only non-participants poll; in-call clients derive the count from the
  // room roster instead.
  isIdle: () => boolean
}

// What non-participants know about the call. The status endpoint (backed by
// LiveKit's participant list) is the source of truth; the broadcast channel
// is only a nudge to re-fetch it.
export function createConferenceStatusStore({
  getCanvasId,
  getEnabled,
  isIdle
}: ConferenceStatusInput) {
  let active = $state(false)
  let count = $state(0)

  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let channel: RealtimeChannel | null = null

  async function refresh() {
    const canvasId = getCanvasId()
    if (!canvasId || !getEnabled() || !isIdle()) {
      return
    }
    try {
      const response = await fetchConferenceStatus(canvasId)
      if (canvasId !== getCanvasId()) {
        return
      }
      active = response.active
      count = response.count
    } catch {
      // Keep the last known state; the focus listener and slow poll will
      // correct it.
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null
      void refresh()
    }, 500)
  }

  function broadcastChanged() {
    void channel?.send({
      type: 'broadcast',
      event: 'conference-changed',
      payload: {}
    })
  }

  // Broadcast channel: members nudge each other on join/leave; receivers
  // re-fetch the status endpoint. Re-runs (and resets state) per canvas.
  $effect(() => {
    const client = supabase
    const canvasId = getCanvasId()
    active = false
    count = 0
    if (!client || !canvasId || !getEnabled()) {
      return
    }

    const nextChannel = client
      .channel(conferenceChannelName(canvasId))
      .on('broadcast', { event: 'conference-changed' }, () => {
        scheduleRefresh()
      })
      .subscribe()
    channel = nextChannel

    void refresh()

    return () => {
      if (channel === nextChannel) {
        channel = null
      }
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
      void client.removeChannel(nextChannel)
    }
  })

  // Drift correction for crashed tabs: refetch on window focus, plus a slow
  // poll while an indicator claims a call is running that we're not in.
  $effect(() => {
    if (!getEnabled()) {
      return
    }
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  })

  $effect(() => {
    if (!getEnabled() || !active || !isIdle()) {
      return
    }
    const interval = setInterval(() => void refresh(), 60_000)
    return () => clearInterval(interval)
  })

  return {
    get active() {
      return active
    },
    get count() {
      return count
    },
    refresh,
    broadcastChanged
  }
}

export type ConferenceStatusStore = ReturnType<
  typeof createConferenceStatusStore
>
