<script lang="ts">
  import { Chat } from '@ai-sdk/svelte'
  import { DefaultChatTransport, type UIMessage } from 'ai'
  import { BookOpen, Globe, LoaderCircle } from 'lucide-svelte'
  import { getApiHeaders } from '$lib/api-client'
  import { defaultModelId } from '$lib/scenes/models'
  import {
    asParts,
    isWebSearchPart,
    partText,
    readContextPart,
    sourceUrlPart
  } from '$lib/scenes/chat-parts'
  import { renderMarkdown } from '$lib/scenes/markdown'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasChatComposer from '$lib/components/canvas/chat/CanvasChatComposer.svelte'
  import VirtualizedMessageList from '$lib/components/shared/VirtualizedMessageList.svelte'

  let { canvasId, threadId, initialMessages } = $props<{
    canvasId: string
    threadId: string
    initialMessages: UIMessage[]
  }>()

  const store = useCanvasChatStore()

  // Web search is on by default for the Assistant.
  let webSearch = $state(true)

  const chat = new Chat({
    // svelte-ignore state_referenced_locally -- history seeds the chat once;
    // the thread only mounts after it has loaded
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/canvas-assistant',
      prepareSendMessagesRequest: async ({ messages }) => ({
        headers: await getApiHeaders({ 'content-type': 'application/json' }),
        body: {
          canvasId,
          threadId,
          modelId: defaultModelId,
          webSearch,
          messages
        }
      })
    }),
    onFinish: () => {
      store.snapshotAssistantMessages(
        threadId,
        $state.snapshot(chat.messages) as UIMessage[]
      )
    }
  })

  const isStreaming = $derived(
    chat.status === 'submitted' || chat.status === 'streaming'
  )

  const visible = $derived(store.open && store.activeTab === 'assistant')
  const fullscreen = $derived(store.displayMode === 'fullscreen')
  const messageListClass = $derived(fullscreen ? 'px-4 py-6' : 'px-4 py-3')
  const messageItemClass = $derived(
    fullscreen ? 'w-full max-w-3xl self-center' : ''
  )
  const footerItemClass = $derived(fullscreen ? 'mx-auto w-full max-w-3xl' : '')
  const messageBubbleClass = $derived(
    fullscreen ? 'max-w-[78%]' : 'max-w-[85%]'
  )

  $effect(() => {
    if (isStreaming) {
      store.setAssistantStreamingThread(threadId)
    } else if (store.assistantStreamingThreadId === threadId) {
      store.setAssistantStreamingThread(null)
    }
  })

  function sendMessage(text: string) {
    store.noteAssistantUserMessage(threadId, text)
    void chat.sendMessage({ text })
  }

  function messageTextLength(message: UIMessage | undefined) {
    return asParts(message?.parts ?? []).reduce(
      (length, part) => length + (partText(part)?.length ?? 0),
      0
    )
  }

  const displayMessages = $derived(
    chat.messages.filter((message) => message.role !== 'system')
  )
  const followKey = $derived(
    `${displayMessages.length}:${chat.status}:${messageTextLength(displayMessages[displayMessages.length - 1])}`
  )
</script>

<div class="flex h-full min-h-0 flex-col">
  <VirtualizedMessageList
    items={displayMessages}
    keyForItem={(message) => message.id}
    estimateSize={104}
    active={visible}
    followMode="when-at-end"
    {followKey}
    className={messageListClass}
    itemClassName={messageItemClass}
  >
    {#snippet item(message)}
      <div
        class={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
      >
        <span class="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
          {message.role === 'user' ? 'You' : 'Assistant'}
        </span>
        <div
          class={`${messageBubbleClass} rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'border border-border/60 bg-background/70 text-foreground'
          }`}
        >
          {#each asParts(message.parts) as part, index (index)}
            {@const text = partText(part)}
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
            {:else if context}
              <span
                class="my-1 mr-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
              >
                <BookOpen class="size-3" />
                Read context: {context.title}
              </span>
            {:else if isWebSearchPart(part)}
              <span
                class="my-1 mr-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Globe class="size-3" />
                Searched the web
              </span>
            {:else if source}
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                class="my-1 mr-1 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-xs text-primary hover:bg-primary/5"
              >
                <Globe class="size-3 shrink-0" />
                <span class="truncate">{source.title}</span>
              </a>
            {/if}
          {/each}
        </div>
      </div>
    {/snippet}

    {#snippet after()}
      {#if chat.status === 'submitted'}
        <div class={footerItemClass}>
          <div
            class="mt-3 flex items-center gap-2 px-1 text-xs text-muted-foreground"
            role="status"
          >
            <LoaderCircle
              class="size-3.5 animate-spin text-primary"
              aria-hidden="true"
            />
            Thinking…
          </div>
        </div>
      {/if}
    {/snippet}

    {#snippet empty()}
      {#if chat.status === 'ready'}
        <div
          class="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground"
        >
          Ask the assistant anything — it can search the web and read this
          canvas's saved documents.
        </div>
      {/if}
    {/snippet}
  </VirtualizedMessageList>

  {#if chat.error}
    <div
      class="mx-3 mb-2 flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
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

  {#if fullscreen}
    <div class="border-t border-border/50 px-4 py-4">
      <div class="mx-auto w-full max-w-3xl">
        <CanvasChatComposer
          {isStreaming}
          disabled={!threadId}
          placeholder="Ask the assistant…"
          className="border-t-0 px-0 py-0"
          {webSearch}
          onWebSearchToggle={() => (webSearch = !webSearch)}
          onSend={sendMessage}
        />
      </div>
    </div>
  {:else}
    <CanvasChatComposer
      {isStreaming}
      disabled={!threadId}
      placeholder="Ask the assistant…"
      {webSearch}
      onWebSearchToggle={() => (webSearch = !webSearch)}
      onSend={sendMessage}
    />
  {/if}
</div>

<style>
  /* Compact prose for assistant bubbles, modeled on .notes-prose in
     NotesSceneView but sized for chat. */
  .chat-prose {
    overflow-wrap: break-word;
  }

  .chat-prose :global(> :last-child) {
    margin-bottom: 0;
  }

  .chat-prose :global(h1),
  .chat-prose :global(h2) {
    margin: 0.75rem 0 0.35rem;
    font-size: 1.05rem;
    font-weight: 700;
  }

  .chat-prose :global(h3),
  .chat-prose :global(h4),
  .chat-prose :global(h5),
  .chat-prose :global(h6) {
    margin: 0.6rem 0 0.3rem;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .chat-prose :global(h1:first-child),
  .chat-prose :global(h2:first-child),
  .chat-prose :global(h3:first-child) {
    margin-top: 0;
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

  .chat-prose :global(blockquote) {
    margin: 0 0 0.5rem;
    border-left: 3px solid var(--border);
    padding-left: 0.6rem;
    color: var(--muted-foreground);
  }

  .chat-prose :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }

  .chat-prose :global(hr) {
    margin: 0.75rem 0;
    border: 0;
    border-top: 1px solid var(--border);
  }

  .chat-prose :global(table) {
    margin: 0 0 0.5rem;
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
    font-size: 0.85em;
  }

  .chat-prose :global(th),
  .chat-prose :global(td) {
    border: 1px solid var(--border);
    padding: 0.25rem 0.5rem;
    text-align: left;
  }

  .chat-prose :global(th) {
    background: var(--muted);
    font-weight: 600;
  }
</style>
