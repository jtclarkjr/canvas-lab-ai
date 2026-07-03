<script lang="ts">
  import {
    EllipsisVertical,
    Image as ImageIcon,
    LoaderCircle,
    Pencil,
    Trash2
  } from 'lucide-svelte'
  import { fade, scale } from 'svelte/transition'
  import CanvasTilePreview from '$lib/components/canvas/home/CanvasTilePreview.svelte'
  import type { Canvas } from '$lib/canvas/schema'

  let {
    canvas,
    isEditingTitle,
    editingTitle = $bindable(''),
    titleInputEl = $bindable(null),
    savingTitle,
    isOpening,
    isDimmed,
    menuOpen,
    dateLabel,
    dateValue,
    onNavigate,
    onToggleMenu,
    onUploadIcon,
    onStartRename,
    onDelete,
    onCommitRename,
    onRenameKeydown
  } = $props<{
    canvas: Canvas
    isEditingTitle: boolean
    editingTitle: string
    titleInputEl: HTMLInputElement | null
    savingTitle: boolean
    isOpening: boolean
    isDimmed: boolean
    menuOpen: boolean
    dateLabel: string
    dateValue: string
    onNavigate: (event: MouseEvent, canvas: Canvas) => void | Promise<void>
    onToggleMenu: (event: MouseEvent, canvas: Canvas) => void
    onUploadIcon: (canvas: Canvas) => void
    onStartRename: (canvas: Canvas) => void | Promise<void>
    onDelete: (canvas: Canvas) => void
    onCommitRename: (canvas: Canvas) => void | Promise<void>
    onRenameKeydown: (event: KeyboardEvent, canvas: Canvas) => void
  }>()

  function formatCanvasDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formattedDate = $derived(dateValue ? formatCanvasDate(dateValue) : '')
</script>

<div
  out:scale={{ duration: 200, start: 0.92, opacity: 0 }}
  aria-busy={isOpening || savingTitle}
  class={`group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md ${isOpening ? 'border-primary/60 shadow-lg ring-2 ring-primary/25' : ''} ${isDimmed ? 'opacity-60' : ''}`}
>
  {#if !isEditingTitle}
    <div
      class={`absolute right-2 top-2 z-10 hidden transition md:block ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100'}`}
      data-canvas-tile-menu
    >
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-card/95 text-muted-foreground shadow-md backdrop-blur-sm transition hover:bg-popover hover:text-popover-foreground focus:bg-popover focus:text-popover-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
        onclick={(event) => onToggleMenu(event, canvas)}
        disabled={isOpening || savingTitle}
        aria-label={`Canvas actions for "${canvas.title}"`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Canvas actions"
      >
        <EllipsisVertical class="size-4" aria-hidden="true" />
      </button>

      {#if menuOpen}
        <div
          class="absolute right-0 top-full mt-1 min-w-32 rounded-lg border border-border/70 bg-popover p-1 text-sm text-popover-foreground shadow-xl"
          role="menu"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-muted"
            role="menuitem"
            aria-label="Canvas icon"
            title="Canvas icon"
            onclick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onUploadIcon(canvas)
            }}
          >
            <ImageIcon class="size-4" aria-hidden="true" />
            Icon
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-muted"
            role="menuitem"
            onclick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void onStartRename(canvas)
            }}
          >
            <Pencil class="size-4" aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
            role="menuitem"
            onclick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete(canvas)
            }}
          >
            <Trash2 class="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if isEditingTitle}
    <div class="flex h-full flex-col">
      <CanvasTilePreview {canvas} />

      <div class="flex h-1/4 flex-col justify-center gap-1 px-3">
        <div class="flex items-center gap-2">
          <input
            bind:this={titleInputEl}
            bind:value={editingTitle}
            class="min-w-0 flex-1 rounded-md border border-primary/40 bg-background/95 px-2 py-1 text-sm font-medium text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
            maxlength="100"
            readonly={savingTitle}
            aria-label={`Rename "${canvas.title}"`}
            onblur={() => void onCommitRename(canvas)}
            onkeydown={(event) => onRenameKeydown(event, canvas)}
          />
          {#if savingTitle}
            <LoaderCircle
              class="size-4 shrink-0 animate-spin text-primary"
              aria-hidden="true"
            />
          {/if}
        </div>
        <p class="m-0 text-xs text-muted-foreground">
          {#if formattedDate}
            {dateLabel} {formattedDate}
          {/if}
        </p>
      </div>
    </div>
  {:else}
    <a
      href={`/canvas/${canvas.id}`}
      onclick={(event) => void onNavigate(event, canvas)}
      class="flex h-full flex-col"
    >
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
    </a>
  {/if}

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
</div>
