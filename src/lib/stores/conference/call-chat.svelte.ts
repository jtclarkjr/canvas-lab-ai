import {
  CALL_CHAT_TEXT_TOPIC,
  CALL_CHAT_VERSION,
  callChatAttributesSchema,
  callChatContentSchema,
  type CallChatAttributes
} from '$lib/conference/call-chat'
import type {
  ConferenceCallChatAuthor,
  ConferenceCallChatEntry,
  ConferenceCallChatMessage,
  ConferenceTextStream
} from '$lib/conference/types'
import type { ConferenceRoomStore } from '$lib/stores/conference/room/types'

type ConferenceCallChatInput = {
  getUserId: () => string
  getEnabled: () => boolean
  room: ConferenceRoomStore
  isVisible: () => boolean
}

const FALLBACK_COLOR = 'var(--color-muted-foreground)'

export function createConferenceCallChatStore({
  getUserId,
  getEnabled,
  room,
  isVisible
}: ConferenceCallChatInput) {
  let entries = $state<ConferenceCallChatEntry[]>([])
  let unreadCount = $state(0)

  function localAuthor(): ConferenceCallChatAuthor {
    const local = room.participants.find((participant) => participant.isLocal)
    return {
      id: getUserId(),
      name: local?.name ?? 'You',
      color: local?.color ?? 'var(--color-primary)'
    }
  }

  function entryAttributes(
    message: ConferenceCallChatMessage
  ): CallChatAttributes {
    return {
      v: CALL_CHAT_VERSION,
      id: message.id,
      createdAt: message.createdAt,
      senderName: message.author.name,
      senderColor: message.author.color
    }
  }

  async function deliver(messageId: string) {
    const entry = entries.find((item) => item.message.id === messageId)
    if (!entry) return

    try {
      await room.sendText(
        CALL_CHAT_TEXT_TOPIC,
        entry.message.content,
        entryAttributes(entry.message)
      )
      entries = entries.map((item) =>
        item.message.id === messageId
          ? { message: item.message, status: 'sent' }
          : item
      )
    } catch (error) {
      entries = entries.map((item) =>
        item.message.id === messageId
          ? {
              ...item,
              status: 'failed',
              errorMessage:
                error instanceof Error ? error.message : 'Failed to send.'
            }
          : item
      )
    }
  }

  async function send(text: string) {
    if (!getEnabled() || !room.isInCall) return

    const parsed = callChatContentSchema.safeParse(text)
    if (!parsed.success) return

    const author = localAuthor()
    const message: ConferenceCallChatMessage = {
      id: crypto.randomUUID(),
      content: parsed.data,
      author,
      createdBy: getUserId(),
      createdAt: new Date().toISOString()
    }

    entries = [...entries, { message, status: 'pending' }]
    await deliver(message.id)
  }

  async function retry(messageId: string) {
    entries = entries.map((item) =>
      item.message.id === messageId
        ? { message: item.message, status: 'pending' }
        : item
    )
    await deliver(messageId)
  }

  function dismissFailed(messageId: string) {
    entries = entries.filter((item) => item.message.id !== messageId)
  }

  function handleText(stream: ConferenceTextStream) {
    if (stream.topic !== CALL_CHAT_TEXT_TOPIC || !getEnabled()) return

    const content = callChatContentSchema.safeParse(stream.text)
    const attributes = callChatAttributesSchema.safeParse(stream.attributes)
    if (!content.success || !attributes.success) return

    const id = attributes.data.id
    if (entries.some((entry) => entry.message.id === id)) return

    const participant = room.participants.find(
      (item) => item.identity === stream.participantIdentity
    )
    const createdBy = stream.participantIdentity ?? null
    const own = createdBy === getUserId()
    const author: ConferenceCallChatAuthor = {
      id: createdBy ?? id,
      name: attributes.data.senderName || participant?.name || 'Someone',
      color: attributes.data.senderColor || participant?.color || FALLBACK_COLOR
    }

    entries = [
      ...entries,
      {
        message: {
          id,
          content: content.data,
          author,
          createdBy,
          createdAt: attributes.data.createdAt
        },
        status: 'sent'
      }
    ]

    if (!own && !isVisible()) {
      unreadCount += 1
    }
  }

  $effect(() => {
    if (isVisible()) {
      unreadCount = 0
    }
  })

  $effect(() => {
    if (room.status === 'idle') {
      entries = []
      unreadCount = 0
    }
  })

  return {
    get entries() {
      return entries
    },
    get unreadCount() {
      return unreadCount
    },
    send,
    retry,
    dismissFailed,
    handleText,
    markRead: () => {
      unreadCount = 0
    }
  }
}
