import type { RealtimeChannel } from '@supabase/supabase-js'
import type { CanvasVisibility } from '$lib/canvas/schema'
import { ensureSessionInitialized, supabase } from '$lib/auth/session-store'

export const CANVAS_VISIBILITY_CHANGED_EVENT = 'canvas-visibility-changed'

export type CanvasVisibilityChangedPayload = {
  canvasId: string
  visibility: CanvasVisibility
}

export function canvasVisibilityChannelName(canvasId: string) {
  return `canvas:${canvasId}:visibility`
}

function waitForSubscription(channel: RealtimeChannel) {
  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 1500)

    channel.subscribe((status) => {
      if (
        status === 'SUBSCRIBED' ||
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        window.clearTimeout(timeout)
        resolve()
      }
    })
  })
}

export async function broadcastCanvasVisibilityChange(
  canvasId: string,
  visibility: CanvasVisibility
) {
  const client = supabase
  if (!client) {
    return
  }

  const session = await ensureSessionInitialized()
  if (session?.access_token) {
    void client.realtime.setAuth(session.access_token)
  }

  const channel = client.channel(canvasVisibilityChannelName(canvasId))
  try {
    await waitForSubscription(channel)
    await channel.send({
      type: 'broadcast',
      event: CANVAS_VISIBILITY_CHANGED_EVENT,
      payload: { canvasId, visibility } satisfies CanvasVisibilityChangedPayload
    })
  } finally {
    void client.removeChannel(channel)
  }
}
