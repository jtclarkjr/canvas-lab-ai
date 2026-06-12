import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel
} from '@supabase/supabase-js'
import { supabase } from '$lib/auth/session-store'
import type { SceneActivity, SceneActivityKind } from '$lib/scenes/types'

const FLUSH_INTERVAL_MS = 150
const STALE_ACTIVITY_MS = 10_000

type ActivityEntry = SceneActivity & { timestamp: number }

type WorkspaceSceneActivityInput = {
  getActiveCanvasId: () => string
  getUserId: () => string
}

// Broadcast channel that lets every canvas participant watch scene work
// happen live: "generating"/"drawing" badges on cards, plus streamed AI
// text deltas relayed to viewers who have the same scene open.
export function createWorkspaceSceneActivityStore({
  getActiveCanvasId,
  getUserId
}: WorkspaceSceneActivityInput) {
  let activity = $state<Record<string, ActivityEntry>>({})
  let streamingText = $state<Record<string, string>>({})

  let currentChannel: RealtimeChannel | null = null
  let pendingDelta = ''
  let pendingSceneId: string | null = null
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  function sendActivity(payload: SceneActivity) {
    void currentChannel?.send({
      type: 'broadcast',
      event: 'scene-activity',
      payload: { ...payload, timestamp: Date.now() }
    })
  }

  function flushPendingDelta() {
    flushTimer = null
    if (!pendingSceneId) return

    const textDelta = pendingDelta
    pendingDelta = ''
    sendActivity({
      sceneId: pendingSceneId,
      userId: getUserId(),
      kind: 'generating',
      ...(textDelta ? { textDelta } : null)
    })
  }

  // Local user reports their own activity. Text deltas are buffered and
  // flushed on an interval so streaming doesn't flood the channel.
  function broadcastActivity(
    sceneId: string,
    kind: SceneActivityKind,
    textDelta?: string
  ) {
    if (kind === 'generating' && textDelta !== undefined) {
      if (pendingSceneId !== sceneId) {
        pendingSceneId = sceneId
        pendingDelta = ''
      }
      pendingDelta += textDelta
      flushTimer ??= setTimeout(flushPendingDelta, FLUSH_INTERVAL_MS)
      return
    }

    if (flushTimer) {
      clearTimeout(flushTimer)
      flushPendingDelta()
    }
    if (kind === 'idle') {
      pendingSceneId = null
      pendingDelta = ''
    }

    sendActivity({ sceneId, userId: getUserId(), kind })
  }

  function applyRemoteActivity(entry: ActivityEntry) {
    if (entry.userId === getUserId()) {
      return
    }

    if (entry.kind === 'idle') {
      activity = Object.fromEntries(
        Object.entries(activity).filter(([key]) => key !== entry.sceneId)
      )
      streamingText = Object.fromEntries(
        Object.entries(streamingText).filter(([key]) => key !== entry.sceneId)
      )
      return
    }

    const previous = activity[entry.sceneId]
    activity = { ...activity, [entry.sceneId]: entry }

    if (entry.kind === 'generating') {
      const base =
        previous?.kind === 'generating' ? (streamingText[entry.sceneId] ?? '') : ''
      if (entry.textDelta) {
        streamingText = {
          ...streamingText,
          [entry.sceneId]: base + entry.textDelta
        }
      }
    }
  }

  $effect(() => {
    const client = supabase
    const activeCanvasId = getActiveCanvasId()
    if (!client || !activeCanvasId) {
      activity = {}
      streamingText = {}
      return
    }

    const channel = client
      .channel(`canvas:${activeCanvasId}:scenes-activity`)
      .on(
        'broadcast',
        { event: 'scene-activity' },
        (data: { payload: ActivityEntry }) => {
          applyRemoteActivity(data.payload)
        }
      )
      .subscribe((status) => {
        currentChannel =
          status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED ? channel : null
      })

    // Prune stale entries in case a sender disconnected mid-generation.
    const pruneTimer = setInterval(() => {
      const cutoff = Date.now() - STALE_ACTIVITY_MS
      const stale = Object.values(activity).filter(
        (entry) => entry.timestamp < cutoff
      )
      if (stale.length === 0) return

      const staleIds = new Set(stale.map((entry) => entry.sceneId))
      activity = Object.fromEntries(
        Object.entries(activity).filter(([key]) => !staleIds.has(key))
      )
      streamingText = Object.fromEntries(
        Object.entries(streamingText).filter(([key]) => !staleIds.has(key))
      )
    }, STALE_ACTIVITY_MS)

    return () => {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      clearInterval(pruneTimer)
      currentChannel = null
      void client.removeChannel(channel)
    }
  })

  return {
    broadcastActivity,
    get activity() {
      return activity
    },
    get streamingText() {
      return streamingText
    }
  }
}
