<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte'
  import { fade, scale } from 'svelte/transition'
  import CanvasTilePreview from '$lib/components/canvas/home/CanvasTilePreview.svelte'
  import RoleBadge from '$lib/components/shared/RoleBadge.svelte'
  import type { Canvas } from '$lib/canvas/schema'

  let { canvas, isOpening, isDimmed, dateLabel, dateValue, onNavigate } =
    $props<{
      canvas: Canvas
      isOpening: boolean
      isDimmed: boolean
      dateLabel: string
      dateValue: string
      onNavigate: (event: MouseEvent, canvas: Canvas) => void | Promise<void>
    }>()

  function formatCanvasDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formattedDate = $derived(dateValue ? formatCanvasDate(dateValue) : '')
</script>

<a
  href={`/canvas/${canvas.id}`}
  onclick={(event) => void onNavigate(event, canvas)}
  out:scale={{ duration: 200, start: 0.92, opacity: 0 }}
  aria-busy={isOpening}
  class={`group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md ${isOpening ? 'border-primary/60 shadow-lg ring-2 ring-primary/25' : ''} ${isDimmed ? 'opacity-60' : ''}`}
>
  <div class="absolute right-2 top-2 z-10">
    <RoleBadge role={canvas.role ?? 'reader'} />
  </div>

  <CanvasTilePreview {canvas} />

  <div class="flex h-1/4 flex-col justify-center gap-1 px-4">
    <h2
      class="m-0 truncate text-sm font-medium text-card-foreground group-hover:text-primary"
    >
      {canvas.title}
    </h2>
    <p class="m-0 text-xs text-muted-foreground">
      {#if formattedDate}
        {dateLabel} {formattedDate}
      {/if}
    </p>
  </div>

  {#if isOpening}
    <div
      in:fade={{ duration: 120 }}
      class="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[2px]"
    >
      <div
        in:scale={{ duration: 140, start: 0.95 }}
        class="inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-xs font-semibold text-foreground shadow-lg"
      >
        <LoaderCircle class="size-4 animate-spin text-primary" />
        Opening
      </div>
    </div>
  {/if}
</a>
