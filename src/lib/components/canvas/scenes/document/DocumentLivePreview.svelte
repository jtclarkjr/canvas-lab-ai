<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte'

  let { title, content } = $props<{
    title: string
    content: string
  }>()

  let scrollEl = $state<HTMLDivElement | null>(null)

  // Follow the document as it streams in.
  $effect(() => {
    void content
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight
    }
  })
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="flex items-center justify-between gap-2 border-b border-border/50 px-5 py-2.5">
    <span class="truncate text-sm font-semibold text-foreground">
      {title || 'Untitled draft'}
    </span>
    <span
      class="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
    >
      <LoaderCircle class="size-3 animate-spin" />
      AI is writing…
    </span>
  </div>

  <div bind:this={scrollEl} class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
    <pre
      class="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">{content}</pre>
  </div>
</div>
