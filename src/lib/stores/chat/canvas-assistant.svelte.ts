import type { UIMessage } from 'ai'
import { ApiClientError } from '$lib/api-client'
import { deriveAssistantThreadTitleFromText } from '$lib/chat/assistant-title'
import {
  deleteAssistantThread,
  listAssistantThreadMessages,
  listAssistantThreads,
  updateAssistantThread
} from '$lib/chat/api'
import type { AssistantThread } from '$lib/chat/schema'
import { asParts, partText } from '$lib/scenes/chat-parts'

export type AssistantThreadEntry = AssistantThread & {
  local?: boolean
}

type CanvasAssistantStoreInput = {
  getCanvasId: () => string
}

const assistantThreadsCache = new Map<string, AssistantThreadEntry[]>()
const assistantMessagesCache = new Map<string, UIMessage[]>()
const assistantActiveThreadCache = new Map<string, string>()

function messagesKey(canvasId: string, threadId: string) {
  return `${canvasId}:${threadId}`
}

function nowIso() {
  return new Date().toISOString()
}

function createDraftThread(canvasId: string): AssistantThreadEntry {
  const now = nowIso()

  return {
    id: crypto.randomUUID(),
    canvasId,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    local: true
  }
}

function threadTitleFromText(text: string) {
  return deriveAssistantThreadTitleFromText(text)
}

function sortThreads(threads: AssistantThreadEntry[]) {
  return [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback
}

export function createCanvasAssistantStore({
  getCanvasId
}: CanvasAssistantStoreInput) {
  let threads = $state<AssistantThreadEntry[]>([])
  let activeThreadId = $state<string | null>(null)
  let initialMessages = $state<UIMessage[] | null>(null)
  let loadError = $state<string | null>(null)
  let threadsLoadError = $state<string | null>(null)
  let isLoadingThreads = $state(false)
  let isLoadingMessages = $state(false)
  let streamingThreadId = $state<string | null>(null)

  let loadedThreadsForCanvasId: string | null = null
  let loadedMessagesForKey: string | null = null
  let threadsLoadPromise: Promise<void> | null = null
  let messagesLoadPromise: Promise<void> | null = null
  let messagesLoadPromiseKey: string | null = null

  function cacheThreads(canvasId: string) {
    assistantThreadsCache.set(canvasId, threads)
    if (activeThreadId) {
      assistantActiveThreadCache.set(canvasId, activeThreadId)
    }
  }

  function setThreads(canvasId: string, nextThreads: AssistantThreadEntry[]) {
    threads = sortThreads(nextThreads)
    cacheThreads(canvasId)
  }

  function ensureDraftThread(canvasId: string) {
    const existingDraft = threads.find((thread) => thread.local)
    if (existingDraft) {
      return existingDraft
    }

    const draft = createDraftThread(canvasId)
    setThreads(canvasId, [draft, ...threads])
    return draft
  }

  function setActiveThread(canvasId: string, threadId: string) {
    activeThreadId = threadId
    assistantActiveThreadCache.set(canvasId, threadId)

    const cached = assistantMessagesCache.get(messagesKey(canvasId, threadId))
    const thread = threads.find((item) => item.id === threadId)
    if (thread?.local) {
      initialMessages = cached ?? []
      loadedMessagesForKey = messagesKey(canvasId, threadId)
    } else {
      initialMessages = cached ?? null
      loadedMessagesForKey = cached ? messagesKey(canvasId, threadId) : null
    }
    loadError = null
  }

  async function ensureMessagesLoaded(
    threadId = activeThreadId,
    options: { force?: boolean } = {}
  ) {
    const canvasId = getCanvasId()
    if (!canvasId || !threadId) {
      return
    }

    const key = messagesKey(canvasId, threadId)
    const thread = threads.find((item) => item.id === threadId)
    const cached = assistantMessagesCache.get(key)

    if (thread?.local) {
      if (activeThreadId === threadId) {
        initialMessages = cached ?? []
        loadedMessagesForKey = key
      }
      return
    }

    if (cached && activeThreadId === threadId && initialMessages === null) {
      initialMessages = cached
    }

    if (loadedMessagesForKey === key && !options.force) {
      return
    }
    if (messagesLoadPromise && messagesLoadPromiseKey === key) {
      return messagesLoadPromise
    }

    isLoadingMessages = activeThreadId === threadId && !cached
    loadError = null

    const loadingKey = key
    messagesLoadPromiseKey = loadingKey
    messagesLoadPromise = (async () => {
      try {
        const response = await listAssistantThreadMessages(canvasId, threadId)
        if (canvasId !== getCanvasId()) {
          return
        }

        const messages: UIMessage[] = response.items.map((item) => ({
          id: item.id,
          role: item.role,
          parts: item.parts
        }))

        assistantMessagesCache.set(key, messages)
        if (activeThreadId === threadId) {
          initialMessages = messages
          loadedMessagesForKey = key
        }
      } catch (error) {
        if (canvasId !== getCanvasId() || activeThreadId !== threadId) {
          return
        }
        if (initialMessages === null) {
          loadError = errorMessage(error, 'Failed to load assistant messages.')
        }
      } finally {
        if (canvasId === getCanvasId() && activeThreadId === threadId) {
          isLoadingMessages = false
        }
        if (messagesLoadPromiseKey === loadingKey) {
          messagesLoadPromise = null
          messagesLoadPromiseKey = null
        }
      }
    })()

    return messagesLoadPromise
  }

  async function ensureThreadsLoaded(options: { force?: boolean } = {}) {
    const canvasId = getCanvasId()
    if (!canvasId) {
      return
    }
    if (loadedThreadsForCanvasId === canvasId && !options.force) {
      return
    }
    if (threadsLoadPromise) {
      return threadsLoadPromise
    }

    const cachedThreads = assistantThreadsCache.get(canvasId)
    if (cachedThreads && threads.length === 0) {
      threads = cachedThreads
    }

    isLoadingThreads = threads.length === 0
    threadsLoadError = null

    threadsLoadPromise = (async () => {
      try {
        const response = await listAssistantThreads(canvasId)
        if (canvasId !== getCanvasId()) {
          return
        }

        const serverThreads: AssistantThreadEntry[] = response.items
        const currentActiveLocal = threads.find(
          (thread) => thread.id === activeThreadId && thread.local
        )
        const nextThreads =
          currentActiveLocal &&
          !serverThreads.some((thread) => thread.id === currentActiveLocal.id)
            ? [currentActiveLocal, ...serverThreads]
            : serverThreads

        setThreads(
          canvasId,
          nextThreads.length > 0 ? nextThreads : [createDraftThread(canvasId)]
        )

        const cachedActive = assistantActiveThreadCache.get(canvasId)
        let preferred = threads[0]?.id
        if (
          activeThreadId &&
          threads.some((thread) => thread.id === activeThreadId)
        ) {
          preferred = activeThreadId
        } else if (
          cachedActive &&
          threads.some((thread) => thread.id === cachedActive)
        ) {
          preferred = cachedActive
        }

        if (preferred) {
          setActiveThread(canvasId, preferred)
          await ensureMessagesLoaded(preferred)
        }

        loadedThreadsForCanvasId = canvasId
      } catch (error) {
        if (canvasId !== getCanvasId()) {
          return
        }
        threadsLoadError = errorMessage(
          error,
          'Failed to load assistant histories.'
        )
      } finally {
        if (canvasId === getCanvasId()) {
          isLoadingThreads = false
        }
        threadsLoadPromise = null
      }
    })()

    return threadsLoadPromise
  }

  function selectThread(threadId: string) {
    const canvasId = getCanvasId()
    if (!canvasId || streamingThreadId) {
      return
    }
    if (!threads.some((thread) => thread.id === threadId)) {
      return
    }

    setActiveThread(canvasId, threadId)
    void ensureMessagesLoaded(threadId)
  }

  function newThread() {
    const canvasId = getCanvasId()
    if (!canvasId || streamingThreadId) {
      return
    }

    const current = activeThreadId
      ? threads.find((thread) => thread.id === activeThreadId)
      : null
    const currentMessages =
      current && activeThreadId
        ? (assistantMessagesCache.get(messagesKey(canvasId, activeThreadId)) ??
          initialMessages ??
          [])
        : []

    if (current?.local && currentMessages.length === 0) {
      setActiveThread(canvasId, current.id)
      return
    }

    const draft = createDraftThread(canvasId)
    assistantMessagesCache.set(messagesKey(canvasId, draft.id), [])
    setThreads(canvasId, [draft, ...threads])
    setActiveThread(canvasId, draft.id)
  }

  function noteUserMessage(threadId: string, text: string) {
    const canvasId = getCanvasId()
    if (!canvasId) {
      return
    }

    const title = threadTitleFromText(text)
    threads = sortThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              title: thread.title === 'New chat' ? title : thread.title,
              updatedAt: nowIso()
            }
          : thread
      )
    )
    cacheThreads(canvasId)
  }

  function snapshotMessages(threadId: string, messages: UIMessage[]) {
    const canvasId = getCanvasId()
    if (!canvasId) {
      return
    }

    const key = messagesKey(canvasId, threadId)
    assistantMessagesCache.set(key, messages)
    if (activeThreadId === threadId) {
      initialMessages = messages
      loadedMessagesForKey = key
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'user')
    const title = threadTitleFromText(
      asParts(lastUserMessage?.parts ?? [])
        .map((part) => partText(part) ?? '')
        .join(' ')
    )

    threads = sortThreads(
      threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              title: thread.title === 'New chat' ? title : thread.title,
              updatedAt: nowIso()
            }
          : thread
      )
    )
    cacheThreads(canvasId)
    void ensureThreadsLoaded({ force: true })
  }

  async function renameThread(threadId: string, title: string) {
    const canvasId = getCanvasId()
    const trimmed = title.trim()
    if (!canvasId || !trimmed || streamingThreadId) {
      return
    }

    const previous = threads
    const current = threads.find((thread) => thread.id === threadId)
    if (!current) {
      return
    }

    setThreads(
      canvasId,
      threads.map((thread) =>
        thread.id === threadId
          ? { ...thread, title: trimmed, updatedAt: nowIso() }
          : thread
      )
    )

    if (current.local) {
      return
    }

    try {
      const response = await updateAssistantThread(canvasId, threadId, {
        title: trimmed
      })
      setThreads(
        canvasId,
        threads.map((thread) =>
          thread.id === threadId ? { ...response.item } : thread
        )
      )
    } catch (error) {
      threads = previous
      cacheThreads(canvasId)
      threadsLoadError = errorMessage(
        error,
        'Failed to update assistant history.'
      )
    }
  }

  async function deleteThread(threadId: string) {
    const canvasId = getCanvasId()
    if (!canvasId || streamingThreadId) {
      return
    }

    const target = threads.find((thread) => thread.id === threadId)
    if (!target) {
      return
    }

    const previous = threads
    const nextThreads = threads.filter((thread) => thread.id !== threadId)
    setThreads(
      canvasId,
      nextThreads.length > 0 ? nextThreads : [createDraftThread(canvasId)]
    )

    if (activeThreadId === threadId) {
      const nextActive = threads[0]?.id ?? ensureDraftThread(canvasId).id
      setActiveThread(canvasId, nextActive)
      void ensureMessagesLoaded(nextActive)
    }

    assistantMessagesCache.delete(messagesKey(canvasId, threadId))

    if (target.local) {
      return
    }

    try {
      await deleteAssistantThread(canvasId, threadId)
    } catch (error) {
      threads = previous
      cacheThreads(canvasId)
      if (
        activeThreadId &&
        !threads.some((thread) => thread.id === activeThreadId)
      ) {
        setActiveThread(canvasId, threadId)
      }
      threadsLoadError = errorMessage(
        error,
        'Failed to delete assistant history.'
      )
    }
  }

  function setStreamingThread(threadId: string | null) {
    streamingThreadId = threadId
  }

  let currentCanvasId: string | null = null
  $effect(() => {
    const canvasId = getCanvasId()
    if (canvasId === currentCanvasId) {
      return
    }
    currentCanvasId = canvasId

    threads = assistantThreadsCache.get(canvasId) ?? []
    activeThreadId =
      assistantActiveThreadCache.get(canvasId) ?? threads[0]?.id ?? null
    initialMessages =
      activeThreadId === null
        ? null
        : (assistantMessagesCache.get(messagesKey(canvasId, activeThreadId)) ??
          null)
    loadError = null
    threadsLoadError = null
    isLoadingThreads = false
    isLoadingMessages = false
    streamingThreadId = null
    loadedThreadsForCanvasId = null
    loadedMessagesForKey = null
    threadsLoadPromise = null
    messagesLoadPromise = null
    messagesLoadPromiseKey = null
  })

  return {
    get threads() {
      return threads
    },
    get activeThreadId() {
      return activeThreadId
    },
    get activeThread() {
      return threads.find((thread) => thread.id === activeThreadId) ?? null
    },
    get initialMessages() {
      return initialMessages
    },
    get loadError() {
      return loadError
    },
    get threadsLoadError() {
      return threadsLoadError
    },
    get isLoadingThreads() {
      return isLoadingThreads
    },
    get isLoadingMessages() {
      return isLoadingMessages
    },
    get streamingThreadId() {
      return streamingThreadId
    },
    get isStreaming() {
      return streamingThreadId !== null
    },
    ensureLoaded: () => ensureThreadsLoaded(),
    refreshThreads: () => ensureThreadsLoaded({ force: true }),
    selectThread,
    newThread,
    noteUserMessage,
    snapshotMessages,
    renameThread,
    deleteThread,
    setStreamingThread
  }
}

export type CanvasAssistantStore = ReturnType<typeof createCanvasAssistantStore>
