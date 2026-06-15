import { getContext, setContext } from 'svelte'
import type { UIMessage } from 'ai'
import { ApiClientError } from '$lib/api-client'
import { supabase } from '$lib/auth/session-store'
import {
  listAssistantMessages,
  listChatMembers,
  listChatMessages,
  sendChatMessage
} from '$lib/chat/api'
import type { MessageAuthor } from '$lib/scenes/schema'
import {
  chatMessageRowSchema,
  chatMessageRowToMessage,
  type ChatMessage
} from '$lib/chat/schema'

const CANVAS_CHAT_CONTEXT = Symbol('canvas-chat-store')

export type CanvasChatTab = 'chat' | 'assistant'

export type ChatEntryStatus = 'sent' | 'pending' | 'failed'

export type ChatEntry = {
  message: ChatMessage
  status: ChatEntryStatus
  errorMessage?: string
}

// Module-level caches keyed by canvas id: the skeleton shows only on the
// first-ever load of a canvas; reopening renders instantly from cache.
const chatMessagesCache = new Map<string, ChatMessage[]>()
const assistantMessagesCache = new Map<string, UIMessage[]>()
const chatMembersCache = new Map<string, MessageAuthor[]>()

type CanvasChatStoreInput = {
  getCanvasId: () => string
  getUserId: () => string
  // Gates realtime traffic when the store is provided above the
  // members-only render guard (e.g. for public viewers).
  getEnabled?: () => boolean
}

export function createCanvasChatStore({
  getCanvasId,
  getUserId,
  getEnabled
}: CanvasChatStoreInput) {
  let open = $state(false)
  let hasOpened = $state(false)
  let activeTab = $state<CanvasChatTab>('chat')

  let entries = $state<ChatEntry[]>([])
  let isLoadingChat = $state(false)
  let chatLoadError = $state<string | null>(null)
  let unreadCount = $state(0)
  let mentionMembers = $state<MessageAuthor[]>([])

  let assistantInitialMessages = $state<UIMessage[] | null>(null)
  let assistantLoadError = $state<string | null>(null)

  let loadedChatForCanvasId: string | null = null
  let loadedAssistantForCanvasId: string | null = null
  let loadedMembersForCanvasId: string | null = null
  let chatLoadPromise: Promise<void> | null = null

  function cacheSentMessages(canvasId: string) {
    chatMessagesCache.set(
      canvasId,
      entries
        .filter((entry) => entry.status === 'sent')
        .map((entry) => entry.message)
    )
  }

  async function ensureChatLoaded(options: { force?: boolean } = {}) {
    const canvasId = getCanvasId()
    if (!canvasId) {
      return
    }
    if (loadedChatForCanvasId === canvasId && !options.force) {
      return
    }
    if (chatLoadPromise) {
      return chatLoadPromise
    }

    chatLoadError = null
    // Skeleton only when there is nothing to show yet (no cache and no
    // realtime messages that arrived before the first open).
    isLoadingChat = entries.length === 0

    chatLoadPromise = (async () => {
      try {
        const response = await listChatMessages(canvasId)
        if (canvasId !== getCanvasId()) {
          return
        }

        // The fetched window is authoritative; keep local entries it does
        // not know about (pending/failed sends, fresh realtime arrivals).
        const known = new Set(response.items.map((item) => item.id))
        const extras = entries.filter((entry) => !known.has(entry.message.id))
        entries = [
          ...response.items.map(
            (message): ChatEntry => ({ message, status: 'sent' })
          ),
          ...extras
        ]
        cacheSentMessages(canvasId)
        loadedChatForCanvasId = canvasId
      } catch (error) {
        if (canvasId !== getCanvasId()) {
          return
        }
        chatLoadError =
          error instanceof ApiClientError
            ? error.message
            : 'Failed to load chat messages.'
      } finally {
        if (canvasId === getCanvasId()) {
          isLoadingChat = false
        }
        chatLoadPromise = null
      }
    })()

    return chatLoadPromise
  }

  async function ensureAssistantLoaded() {
    const canvasId = getCanvasId()
    if (!canvasId || loadedAssistantForCanvasId === canvasId) {
      return
    }

    const cached = assistantMessagesCache.get(canvasId)
    if (cached && assistantInitialMessages === null) {
      assistantInitialMessages = cached
    }

    try {
      const response = await listAssistantMessages(canvasId)
      if (canvasId !== getCanvasId()) {
        return
      }

      const messages: UIMessage[] = response.items.map((item) => ({
        id: item.id,
        role: item.role,
        parts: item.parts
      }))

      assistantMessagesCache.set(canvasId, messages)
      // Don't clobber a thread the panel already mounted from cache — the
      // Chat instance owns it from there.
      if (assistantInitialMessages === null) {
        assistantInitialMessages = messages
      }
      assistantLoadError = null
      loadedAssistantForCanvasId = canvasId
    } catch (error) {
      if (canvasId !== getCanvasId() || assistantInitialMessages !== null) {
        return
      }
      assistantLoadError =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to load assistant messages.'
    }
  }

  async function ensureMembersLoaded() {
    const canvasId = getCanvasId()
    if (!canvasId || loadedMembersForCanvasId === canvasId) {
      return
    }

    const cached = chatMembersCache.get(canvasId)
    if (cached) {
      mentionMembers = cached
    }

    try {
      const response = await listChatMembers(canvasId)
      if (canvasId !== getCanvasId()) {
        return
      }
      chatMembersCache.set(canvasId, response.items)
      mentionMembers = response.items
      loadedMembersForCanvasId = canvasId
    } catch {
      // Non-critical — mention picker just stays empty on error.
    }
  }

  async function deliver(messageId: string, canvasId: string) {
    const entry = entries.find((item) => item.message.id === messageId)
    if (!entry) {
      return
    }

    try {
      const response = await sendChatMessage(canvasId, {
        id: messageId,
        content: entry.message.content
      })
      if (canvasId !== getCanvasId()) {
        return
      }
      entries = entries.map((item) =>
        item.message.id === messageId
          ? { message: response.item, status: 'sent' }
          : item
      )
      cacheSentMessages(canvasId)
    } catch (error) {
      if (canvasId !== getCanvasId()) {
        return
      }
      // Failures stay local to this user: the row never reached the
      // database, so nothing is broadcast to other members.
      entries = entries.map((item) =>
        item.message.id === messageId
          ? {
              ...item,
              status: 'failed',
              errorMessage:
                error instanceof ApiClientError
                  ? error.message
                  : 'Failed to send message.'
            }
          : item
      )
    }
  }

  async function send(text: string) {
    const canvasId = getCanvasId()
    const content = text.trim()
    if (!canvasId || !content) {
      return
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      canvasId,
      content,
      author: null,
      createdBy: getUserId(),
      createdAt: new Date().toISOString()
    }

    entries = [...entries, { message, status: 'pending' }]
    await deliver(message.id, canvasId)
  }

  async function retry(messageId: string) {
    const canvasId = getCanvasId()
    if (!canvasId) {
      return
    }
    entries = entries.map((item) =>
      item.message.id === messageId
        ? { message: item.message, status: 'pending' }
        : item
    )
    await deliver(messageId, canvasId)
  }

  function dismissFailed(messageId: string) {
    entries = entries.filter((item) => item.message.id !== messageId)
  }

  function openWindow() {
    open = true
    hasOpened = true
    // Reopening onto the Assistant tab keeps the count: the badge moves
    // from the launcher to the Chat tab until the messages are seen.
    if (activeTab === 'chat') {
      unreadCount = 0
    }
    void ensureChatLoaded()
    void ensureAssistantLoaded()
    void ensureMembersLoaded()
  }

  // Called by the window component after the minimize animation finishes.
  function minimize() {
    open = false
  }

  function setTab(tab: CanvasChatTab) {
    activeTab = tab
    if (tab === 'chat' && open) {
      unreadCount = 0
    }
  }

  function snapshotAssistantMessages(messages: UIMessage[]) {
    const canvasId = getCanvasId()
    if (canvasId) {
      assistantMessagesCache.set(canvasId, messages)
    }
  }

  // Reset per-canvas state when the active canvas switches.
  let currentCanvasId: string | null = null
  $effect(() => {
    const canvasId = getCanvasId()
    if (canvasId === currentCanvasId) {
      return
    }
    currentCanvasId = canvasId

    const cached = chatMessagesCache.get(canvasId)
    entries = (cached ?? []).map(
      (message): ChatEntry => ({ message, status: 'sent' })
    )
    unreadCount = 0
    chatLoadError = null
    isLoadingChat = false
    loadedChatForCanvasId = null
    chatLoadPromise = null
    assistantInitialMessages = assistantMessagesCache.get(canvasId) ?? null
    assistantLoadError = null
    loadedAssistantForCanvasId = null
    mentionMembers = chatMembersCache.get(canvasId) ?? []
    loadedMembersForCanvasId = null

    if (hasOpened) {
      void ensureChatLoaded()
      void ensureAssistantLoaded()
      void ensureMembersLoaded()
    }
  })

  // Realtime: subscribed from mount (not first open) so the unread badge
  // works before the window has ever been opened.
  $effect(() => {
    const client = supabase
    const canvasId = getCanvasId()
    if (!client || !canvasId || (getEnabled && !getEnabled())) {
      return
    }

    const channel = client
      .channel(`canvas:${canvasId}:chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_chat_messages',
          filter: `canvas_id=eq.${canvasId}`
        },
        (payload) => {
          const parsed = chatMessageRowSchema.safeParse(payload.new)
          if (!parsed.success) {
            return
          }
          const incoming = chatMessageRowToMessage(parsed.data)

          const existing = entries.find(
            (entry) => entry.message.id === incoming.id
          )
          if (existing) {
            // Echo of our own send: confirm it if the POST response hasn't
            // landed yet (or failed after the insert committed).
            if (existing.status !== 'sent') {
              entries = entries.map((entry) =>
                entry.message.id === incoming.id
                  ? { message: incoming, status: 'sent' }
                  : entry
              )
              cacheSentMessages(canvasId)
            }
            return
          }

          entries = [...entries, { message: incoming, status: 'sent' }]
          cacheSentMessages(canvasId)

          // Unread = arrived while the chat panel wasn't visible: window
          // minimized (launcher badge) or open on the Assistant tab (Chat
          // tab badge).
          const chatPanelVisible = open && activeTab === 'chat'
          if (!chatPanelVisible && incoming.createdBy !== getUserId()) {
            unreadCount += 1
          }
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })

  return {
    get open() {
      return open
    },
    get hasOpened() {
      return hasOpened
    },
    get activeTab() {
      return activeTab
    },
    get entries() {
      return entries
    },
    get isLoadingChat() {
      return isLoadingChat
    },
    get chatLoadError() {
      return chatLoadError
    },
    get unreadCount() {
      return unreadCount
    },
    get assistantInitialMessages() {
      return assistantInitialMessages
    },
    get assistantLoadError() {
      return assistantLoadError
    },
    get mentionMembers() {
      return mentionMembers
    },
    openWindow,
    minimize,
    setTab,
    send,
    retry,
    dismissFailed,
    retryChatLoad: () => ensureChatLoaded({ force: true }),
    // For surfaces showing the chat outside the window (the call's
    // fullscreen chat panel): load without flipping `open`, and clear the
    // unread badge while the messages are actually visible there.
    ensureLoaded: () => ensureChatLoaded(),
    ensureMembersLoaded: () => ensureMembersLoaded(),
    markChatRead: () => {
      unreadCount = 0
    },
    snapshotAssistantMessages
  }
}

export type CanvasChatStore = ReturnType<typeof createCanvasChatStore>

export function provideCanvasChatStore(input: CanvasChatStoreInput) {
  const store = createCanvasChatStore(input)
  setContext(CANVAS_CHAT_CONTEXT, store)
  return store
}

export function useCanvasChatStore() {
  const store = getContext<CanvasChatStore | undefined>(CANVAS_CHAT_CONTEXT)

  if (!store) {
    throw new Error('Canvas chat store was not provided.')
  }

  return store
}

export function useCanvasChatStoreOptional() {
  return getContext<CanvasChatStore | undefined>(CANVAS_CHAT_CONTEXT)
}
