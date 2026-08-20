<script lang="ts">
  import {
    BookOpen,
    FileCheckCorner,
    Globe,
    LoaderCircle,
    Sparkles
  } from 'lucide-svelte'
  import { colorFromId } from '$lib/canvas/helpers/color-from-id'
  import { getModelOption } from '$lib/scenes/models'
  import {
    asParts,
    isWebSearchPart,
    messageAuthor,
    messageModelId,
    partText,
    readContextPart,
    sourceUrlPart,
    writeDocumentPart
  } from '$lib/scenes/chat-parts'
  import type { DisplayMessage } from '$lib/scenes/types'
  import { VirtualizedMessageList } from '$lib/components/shared/collections'

  let {
    messages,
    currentUserId,
    remoteStreamingText = '',
    isRemoteGenerating = false,
    remoteGeneratorName = ''
  } = $props<{
    messages: DisplayMessage[]
    currentUserId: string
    remoteStreamingText?: string
    isRemoteGenerating?: boolean
    remoteGeneratorName?: string
  }>()

  // Attribution lines: collaborators see who wrote each prompt and which
  // model (and requester) produced each response.
  function userLabel(message: DisplayMessage) {
    const author = messageAuthor(message)
    if (!author || author.id === currentUserId) {
      return { name: 'You', color: null as string | null }
    }
    return { name: author.name, color: colorFromId(author.id) }
  }

  function assistantLabel(message: DisplayMessage) {
    const modelId = messageModelId(message)
    const model = modelId ? (getModelOption(modelId)?.label ?? modelId) : null
    const author = messageAuthor(message)
    const requester = author && author.id !== currentUserId ? author.name : null
    return { model, requester }
  }

  function messageTextLength(message: DisplayMessage | undefined) {
    return asParts(message?.parts ?? []).reduce(
      (length, part) => length + (partText(part)?.length ?? 0),
      0
    )
  }

  const displayMessages = $derived.by<DisplayMessage[]>(() =>
    messages.filter((message: DisplayMessage) => message.role !== 'system')
  )
  const followKey = $derived(
    `${displayMessages.length}:${remoteStreamingText.length}:${messageTextLength(displayMessages[displayMessages.length - 1])}`
  )
</script>

<VirtualizedMessageList
  items={displayMessages}
  keyForItem={(message) => message.id}
  estimateSize={112}
  followMode="always"
  {followKey}
  className="h-full px-5 py-4"
>
  {#snippet item(message)}
    <div
      class={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
    >
      {#if message.role === 'user'}
        {@const label = userLabel(message)}
        <span class="mb-0.5 px-1 text-[11px] font-medium text-foreground">
          {label.name}
        </span>
      {:else}
        {@const label = assistantLabel(message)}
        <span class="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
          AI{label.model ? ` · ${label.model}` : ''}{label.requester
            ? ` · for ${label.requester}`
            : ''}
        </span>
      {/if}
      <div
        class={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          message.role === 'user'
            ? 'bg-foreground font-medium text-background'
            : 'border border-border/60 bg-background/70 text-foreground'
        }`}
      >
        {#each asParts(message.parts) as part, index (index)}
          {@const text = partText(part)}
          {@const draft = writeDocumentPart(part)}
          {@const context = readContextPart(part)}
          {@const source = sourceUrlPart(part)}
          {#if text}
            <p class="whitespace-pre-wrap">{text}</p>
          {:else if draft}
            <!-- Codex-style action line: the document content itself never
                 renders in chat — it streams into the editor pane. -->
            <div
              class="my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground"
            >
              {#if draft.state === 'output-available'}
                <FileCheckCorner class="size-3.5 shrink-0 text-emerald-600" />
                <span>
                  Wrote draft <strong class="text-foreground"
                    >{draft.title || 'Untitled'}</strong
                  >
                  <span class="opacity-70">· in the editor</span>
                </span>
              {:else}
                <LoaderCircle
                  class="size-3.5 shrink-0 animate-spin text-primary"
                />
                <span
                  >Writing {draft.title ? `“${draft.title}”` : 'draft'}…</span
                >
              {/if}
            </div>
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
              aria-label={`${source.title} (opens in new tab)`}
              class="my-1 mr-1 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-xs text-primary hover:bg-primary/5"
            >
              <Globe class="size-3 shrink-0" aria-hidden="true" />
              <span class="truncate">{source.title}</span>
            </a>
          {/if}
        {/each}
      </div>
    </div>
  {/snippet}

  {#snippet after()}
    {#if isRemoteGenerating}
      <div class="mt-3 flex justify-start" role="status">
        <div
          class="max-w-[85%] rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm leading-relaxed text-foreground"
        >
          <span
            class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-foreground"
          >
            <Sparkles class="size-3 animate-pulse" />
            {remoteGeneratorName || 'A collaborator'} is generating…
          </span>
          {#if remoteStreamingText}
            <p class="whitespace-pre-wrap">{remoteStreamingText}</p>
          {/if}
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet empty()}
    {#if !isRemoteGenerating}
      <div
        class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
      >
        Start the conversation to draft your document.
      </div>
    {/if}
  {/snippet}
</VirtualizedMessageList>
