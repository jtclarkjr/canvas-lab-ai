<script lang="ts">
  import { Chat } from '@ai-sdk/svelte'
  import { DefaultChatTransport, type UIMessage } from 'ai'
  import {
    BookOpen,
    FileCheckCorner,
    Globe,
    LoaderCircle,
    Sparkles
  } from 'lucide-svelte'
  import { getApiHeaders } from '$lib/api-client'
  import {
    asParts,
    isWebSearchPart,
    messageAuthor,
    messageText,
    partText,
    readContextPart,
    sourceUrlPart,
    writeDocumentPart
  } from '$lib/scenes/chat-parts'
  import { renderMarkdown } from '$lib/scenes/markdown'
  import type { SceneMessage } from '$lib/scenes/schema'
  import type {
    DisplayMessage,
    DraftToolPart,
    SceneActivity,
    SceneActivityKind
  } from '$lib/scenes/types'
  import MobileCanvasChatComposer from '$lib/mobile/components/chat/MobileCanvasChatComposer.svelte'

  let {
    initialMessages,
    buildBody,
    canModify,
    canSend,
    currentUserId,
    liveMessages,
    remoteActivity,
    remoteStreamingText,
    initialPrompt,
    onInitialPromptSent,
    onBroadcastActivity,
    onTurnFinished,
    onLiveDraftChange,
    onMessagesSnapshot,
    webSearch,
    onWebSearchToggle
  } = $props<{
    initialMessages: UIMessage[]
    buildBody: () => Record<string, unknown>
    canModify: boolean
    canSend: boolean
    currentUserId: string
    liveMessages: SceneMessage[]
    remoteActivity: SceneActivity | null
    remoteStreamingText: string
    initialPrompt: string | null
    onInitialPromptSent: () => void
    onBroadcastActivity: (kind: SceneActivityKind, textDelta?: string) => void
    onTurnFinished: () => void
    onLiveDraftChange: (draft: DraftToolPart | null) => void
    onMessagesSnapshot: (messages: UIMessage[]) => void
    webSearch: boolean
    onWebSearchToggle: () => void
  }>()

  const chat = new Chat({
    // svelte-ignore state_referenced_locally -- history seeds this keyed thread once.
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/document-chat',
      prepareSendMessagesRequest: async ({ messages }) => ({
        headers: await getApiHeaders({ 'content-type': 'application/json' }),
        body: { ...buildBody(), messages }
      })
    }),
    onFinish: () => {
      onTurnFinished()
      onMessagesSnapshot($state.snapshot(chat.messages) as UIMessage[])
    }
  })

  const isStreaming = $derived(
    chat.status === 'submitted' || chat.status === 'streaming'
  )
  let initialPromptSent = false
  let scrollEl = $state<HTMLDivElement | null>(null)

  const displayMessages = $derived.by<DisplayMessage[]>(() => {
    const own = chat.messages
    const ownIds = new Set(own.map((message) => message.id))
    const remote = liveMessages
      .filter((message: SceneMessage) => !ownIds.has(message.id))
      .map((message: SceneMessage) => ({
        id: message.id,
        role: message.role,
        parts: message.parts,
        metadata: { ...message.metadata, author: message.author ?? undefined }
      }))
    return [...own, ...(remote as UIMessage[])]
  })

  function userLabel(message: DisplayMessage) {
    const author = messageAuthor(message)
    return author && author.id !== currentUserId ? author.name : 'You'
  }

  function absorbRemoteMessages() {
    const ownIds = new Set(chat.messages.map((message) => message.id))
    const remote = liveMessages.filter(
      (message: SceneMessage) => !ownIds.has(message.id)
    )

    if (remote.length > 0) {
      chat.messages = [
        ...chat.messages,
        ...(remote.map((message: SceneMessage) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
          metadata: { ...message.metadata, author: message.author ?? undefined }
        })) as UIMessage[])
      ]
    }
  }

  function handleSend(text: string) {
    if (!canModify || !canSend || isStreaming) return
    absorbRemoteMessages()
    void chat.sendMessage({ text })
  }

  const liveDraft = $derived.by(() => {
    if (chat.status !== 'submitted' && chat.status !== 'streaming') {
      return null
    }

    const last = chat.lastMessage
    if (last?.role !== 'assistant') {
      return null
    }

    let draft: DraftToolPart | null = null
    for (const part of asParts(last.parts)) {
      draft = writeDocumentPart(part) ?? draft
    }
    return draft
  })

  $effect(() => {
    onLiveDraftChange(liveDraft)
  })

  $effect(() => {
    if (initialPrompt && !initialPromptSent && chat.status === 'ready') {
      const text = initialPrompt
      initialPromptSent = true
      onInitialPromptSent()
      void chat.sendMessage({ text })
    }
  })

  let announcedGenerating = false
  let broadcastTextLength = 0

  $effect(() => {
    const status = chat.status
    const last = chat.lastMessage

    if (status === 'submitted' || status === 'streaming') {
      if (!announcedGenerating) {
        announcedGenerating = true
        broadcastTextLength = 0
        onBroadcastActivity('generating')
      }
      if (last?.role === 'assistant') {
        const text = messageText(last)
        if (text.length > broadcastTextLength) {
          onBroadcastActivity('generating', text.slice(broadcastTextLength))
          broadcastTextLength = text.length
        }
      }
      return
    }

    if (announcedGenerating) {
      announcedGenerating = false
      broadcastTextLength = 0
      onBroadcastActivity('idle')
    }
  })

  $effect(() => {
    void displayMessages.length
    void remoteStreamingText
    void (chat.lastMessage?.parts.length ?? 0)
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight
    }
  })
</script>

<div class="flex h-full min-h-0 flex-col">
  <div
    bind:this={scrollEl}
    class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
  >
    {#each displayMessages as message (message.id)}
      {#if message.role !== 'system'}
        <div
          class={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <span class="mb-1 px-1 text-[11px] font-medium text-muted-foreground">
            {message.role === 'user' ? userLabel(message) : 'AI'}
          </span>
          <div
            class={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border/60 bg-background/80 text-foreground'
            }`}
          >
            {#each asParts(message.parts) as part, index (index)}
              {@const text = partText(part)}
              {@const draft = writeDocumentPart(part)}
              {@const context = readContextPart(part)}
              {@const source = sourceUrlPart(part)}
              {#if text}
                {#if message.role === 'assistant'}
                  <div class="chat-prose">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized via DOMPurify in renderMarkdown -->
                    {@html renderMarkdown(text)}
                  </div>
                {:else}
                  <p class="whitespace-pre-wrap">{text}</p>
                {/if}
              {:else if draft}
                <div
                  class="my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  {#if draft.state === 'output-available'}
                    <FileCheckCorner
                      class="size-3.5 shrink-0 text-emerald-600"
                    />
                    <span>
                      Wrote draft <strong class="text-foreground"
                        >{draft.title || 'Untitled'}</strong
                      >
                    </span>
                  {:else}
                    <LoaderCircle
                      class="size-3.5 shrink-0 animate-spin text-primary"
                    />
                    <span>Writing {draft.title || 'draft'}...</span>
                  {/if}
                </div>
              {:else if context}
                <span
                  class="my-1 mr-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <BookOpen class="size-3" aria-hidden="true" />
                  Read context: {context.title}
                </span>
              {:else if isWebSearchPart(part)}
                <span
                  class="my-1 mr-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <Globe class="size-3" aria-hidden="true" />
                  Searched the web
                </span>
              {:else if source}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  class="my-1 mr-1 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-xs text-primary active:bg-primary/5"
                >
                  <Globe class="size-3 shrink-0" aria-hidden="true" />
                  <span class="truncate">{source.title}</span>
                </a>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    {/each}

    {#if remoteActivity?.kind === 'generating'}
      <div class="flex justify-start" role="status">
        <div
          class="max-w-[88%] rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
        >
          <span class="mb-1 flex items-center gap-1.5 text-xs text-primary">
            <Sparkles class="size-3 animate-pulse" aria-hidden="true" />
            {remoteActivity.userName || 'A collaborator'} is generating...
          </span>
          {#if remoteStreamingText}
            <p class="whitespace-pre-wrap">{remoteStreamingText}</p>
          {/if}
        </div>
      </div>
    {/if}

    {#if chat.status === 'submitted'}
      <div
        class="flex items-center gap-2 px-1 text-xs text-muted-foreground"
        role="status"
      >
        <LoaderCircle
          class="size-3.5 animate-spin text-primary"
          aria-hidden="true"
        />
        Thinking...
      </div>
    {/if}

    {#if displayMessages.length === 0 && chat.status === 'ready'}
      <div
        class="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground"
      >
        Ask AI to draft, revise, or summarize this scene document.
      </div>
    {/if}
  </div>

  {#if chat.error}
    <div
      class="mx-3 mb-2 flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
      role="alert"
    >
      <span>{chat.error.message || 'Something went wrong.'}</span>
      <button
        type="button"
        class="font-medium underline"
        onclick={() => chat.clearError()}
      >
        Dismiss
      </button>
    </div>
  {/if}

  <MobileCanvasChatComposer
    disabled={!canModify || !canSend}
    {isStreaming}
    placeholder="Ask AI to draft..."
    {webSearch}
    {onWebSearchToggle}
    onSend={handleSend}
  />
</div>

<style>
  .chat-prose {
    overflow-wrap: break-word;
  }

  .chat-prose :global(> :last-child) {
    margin-bottom: 0;
  }

  .chat-prose :global(p) {
    margin: 0 0 0.5rem;
  }

  .chat-prose :global(ul),
  .chat-prose :global(ol) {
    margin: 0 0 0.5rem;
    padding-left: 1.25rem;
  }

  .chat-prose :global(ul) {
    list-style: disc;
  }

  .chat-prose :global(ol) {
    list-style: decimal;
  }

  .chat-prose :global(li) {
    margin: 0.15rem 0;
  }

  .chat-prose :global(code) {
    border-radius: 4px;
    background: var(--muted);
    padding: 0.1rem 0.35rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85em;
  }

  .chat-prose :global(pre) {
    margin: 0 0 0.5rem;
    overflow-x: auto;
    border-radius: 8px;
    background: var(--muted);
    padding: 0.6rem 0.75rem;
  }

  .chat-prose :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .chat-prose :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }
</style>
