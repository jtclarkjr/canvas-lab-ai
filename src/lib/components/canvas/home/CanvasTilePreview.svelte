<script lang="ts">
  import { FileText } from 'lucide-svelte'
  import type { Canvas } from '$lib/canvas/schema'

  let { canvas } = $props<{
    canvas: Canvas
  }>()

  let failedIconUrl = $state<string | null>(null)

  const showIcon = $derived(
    Boolean(canvas.iconUrl && failedIconUrl !== canvas.iconUrl)
  )
</script>

<div
  class="h-3/4 overflow-hidden border-b border-border bg-gradient-to-br from-muted to-card"
>
  {#if showIcon}
    <img
      src={canvas.iconUrl ?? ''}
      alt=""
      class="h-full w-full object-cover"
      onerror={() => {
        failedIconUrl = canvas.iconUrl
      }}
    />
  {:else}
    <div class="flex h-full items-center justify-center p-4">
      <div class="rounded-lg bg-background/80 p-4 shadow-inner">
        <FileText class="size-12 text-muted-foreground/50" />
      </div>
    </div>
  {/if}
</div>
