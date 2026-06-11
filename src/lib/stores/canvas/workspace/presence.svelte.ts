import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '$lib/auth/session-store'
import { colorFromId } from '$lib/canvas/helpers/color-from-id'
import { displayMembers as getDisplayMembers } from '$lib/canvas/helpers/display-members'
import { createThrottledCursorSender } from '$lib/canvas/helpers/throttled-cursor-sender'
import type { WorkspaceMember } from '$lib/canvas/types'

type CursorEventPayload = {
  position: { x: number; y: number }
  user: { id: string; name: string }
  color: string
  timestamp: number
}

type WorkspacePresenceInput = {
  getActiveCanvasId: () => string
  getCanvasId: () => string
  getUserId: () => string
  getUserEmail: () => string | null | undefined
}

export function createWorkspacePresenceStore({
  getActiveCanvasId,
  getCanvasId,
  getUserId,
  getUserEmail
}: WorkspacePresenceInput) {
  let cursors = $state<Record<string, CursorEventPayload>>({})
  let members = $state<Record<string, WorkspaceMember>>({})

  function roomName() {
    return getActiveCanvasId() || getCanvasId() || 'lobby'
  }

  $effect(() => {
    const client = supabase
    const activeCanvasId = getActiveCanvasId()
    const userId = getUserId()
    const userEmail = getUserEmail()
    if (!client || !activeCanvasId) {
      cursors = {}
      members = {}
      return
    }

    let lastPayload: CursorEventPayload | null = null
    const throttle = createThrottledCursorSender(32)
    const channel = client.channel(roomName(), {
      config: { presence: { key: userId } }
    })
    let currentChannel: RealtimeChannel | null = null

    const sendCursor = (event: MouseEvent) => {
      const payload: CursorEventPayload = {
        position: { x: event.clientX, y: event.clientY },
        user: { id: userId, name: userEmail ?? 'anon' },
        color: colorFromId(userId),
        timestamp: Date.now()
      }
      lastPayload = payload
      void currentChannel?.send({
        type: 'broadcast',
        event: 'realtime-cursor-move',
        payload
      })
    }

    const handleMouseMove = (event: MouseEvent) => {
      throttle(sendCursor, event)
    }

    channel
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence) => {
          cursors = Object.fromEntries(
            Object.entries(cursors).filter(([key]) => key !== String(presence.key))
          )
          members = Object.fromEntries(
            Object.entries(members).filter(([key]) => key !== String(presence.key))
          )
        })
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ name: string; color: string }>
        >
        const participants = Object.entries(state).reduce<Record<string, WorkspaceMember>>(
          (accumulator, [key, values]) => {
            const latest = values.length > 0 ? values[values.length - 1] : null
            if (latest) {
              accumulator[key] = { name: latest.name, color: latest.color }
            }
            return accumulator
          },
          {}
        )

        members = participants

        if (lastPayload) {
          void currentChannel?.send({
            type: 'broadcast',
            event: 'realtime-cursor-move',
            payload: lastPayload
          })
        }
      })
      .on(
        'broadcast',
        { event: 'realtime-cursor-move' },
        (data: { payload: CursorEventPayload }) => {
          const nextCursor = data.payload
          if (nextCursor.user.id === userId) {
            return
          }
          cursors = { ...cursors, [nextCursor.user.id]: nextCursor }
        }
      )
      .subscribe(async (status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await channel.track({
            key: userId,
            name: userEmail ?? 'anon',
            color: colorFromId(userId)
          })
          currentChannel = channel
          const state = channel.presenceState() as Record<
            string,
            Array<{ name: string; color: string }>
          >
          members = Object.entries(state).reduce<Record<string, WorkspaceMember>>(
            (accumulator, [key, values]) => {
              const latest = values.length > 0 ? values[values.length - 1] : null
              if (latest) {
                accumulator[key] = { name: latest.name, color: latest.color }
              }
              return accumulator
            },
            {}
          )
        } else {
          cursors = {}
          members = {}
          currentChannel = null
        }
      })

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      currentChannel = null
      window.removeEventListener('mousemove', handleMouseMove)
      void client.removeChannel(channel)
    }
  })

  return {
    get cursors() {
      return cursors
    },
    get displayMembers() {
      const userId = getUserId()
      return getDisplayMembers(members, userId, getUserEmail(), colorFromId(userId))
    }
  }
}
