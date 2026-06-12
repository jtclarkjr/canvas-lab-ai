<script lang="ts">
  import { BookOpen, FileCheck2, Globe, LoaderCircle, Sparkles } from 'lucide-svelte'
  import {
    asParts,
    isWebSearchPart,
    partText,
    readContextPart,
    sourceUrlPart,
    writeDocumentPart,
    type DisplayMessage
  } from '$lib/scenes/chat-parts'

  let {
    messages,
    remoteStreamingText = '',
    isRemoteGenerating = false
  } = $props<{
    messages: DisplayMessage[]
    remoteStreamingText?: string
    isRemoteGenerating?: boolean
  }>()

  let scrollEl = $state<HTMLDivElement | null>(null)

  $effect(() => {
    // Track message + stream growth, then keep the view pinned to bottom.
    void messages.length
    void remoteStreamingText
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight
    }
  })
</script>

<div bind:this={scrollEl} class="flex h-full flex-col gap-3 overflow-y-auto px-5 py-4">
  {#each messages as message (message.id)}
    {#if message.role !== 'system'}
      <div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          class={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            message.role === 'user'
              ? 'bg-primary text-white'
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
                  <FileCheck2 class="size-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Wrote draft <strong class="text-foreground">{draft.title || 'Untitled'}</strong>
                    <span class="opacity-70">· in the editor</span>
                  </span>
                {:else}
                  <LoaderCircle class="size-3.5 shrink-0 animate-spin text-primary" />
                  <span>Writing {draft.title ? `“${draft.title}”` : 'draft'}…</span>
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
                class="my-1 mr-1 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-xs text-primary hover:bg-primary/5"
              >
                <Globe class="size-3 shrink-0" />
                <span class="truncate">{source.title}</span>
              </a>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  {#if isRemoteGenerating}
    <div class="flex justify-start">
      <div
        class="max-w-[85%] rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm leading-relaxed text-foreground"
      >
        <span class="mb-1 flex items-center gap-1.5 text-xs text-primary">
          <Sparkles class="size-3 animate-pulse" />
          A collaborator is generating…
        </span>
        {#if remoteStreamingText}
          <p class="whitespace-pre-wrap">{remoteStreamingText}</p>
        {/if}
      </div>
    </div>
  {/if}

  {#if messages.length === 0 && !isRemoteGenerating}
    <div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Start the conversation to draft your document.
    </div>
  {/if}
</div>
