<script lang="ts">
  import { goto } from '$app/navigation'
  import { ChevronDown, House } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import type { Canvas } from '$lib/canvas/schema'
  import type { Tool } from '$lib/canvas/types'
  import CanvasToolbar from '$lib/components/canvas/workspace/CanvasToolbar.svelte'

  let {
    canvases,
    activeCanvasId,
    currentTitle,
    canManageCanvas,
    isLoadingCanvases,
    selectedTool,
    readOnly,
    showNavigation = true,
    onToolChange,
    onTitleSave
  } = $props<{
    canvases: Canvas[]
    activeCanvasId: string
    currentTitle: string
    canManageCanvas: boolean
    isLoadingCanvases: boolean
    selectedTool: Tool
    readOnly: boolean
    showNavigation?: boolean
    onToolChange: (tool: Tool) => void
    onTitleSave: (title: string) => void | Promise<void>
  }>()

  let titleInputEl = $state<HTMLInputElement | null>(null)
  let titleEditorEl = $state<HTMLDivElement | null>(null)
  let dropdownEl = $state<HTMLDivElement | null>(null)
  let showCanvasSelector = $state(false)
  let isEditingTitle = $state(false)
  let isSavingTitle = $state(false)
  let editedTitle = $state('')

  const TITLE_EDIT_WIDTH_PX = 208
  const TITLE_LAYER_CHROME_PX = 26
  const ESTIMATED_TITLE_CHAR_PX = 7
  const ESTIMATED_TITLE_LETTER_SPACING_PX = 2

  let titleMeasureWidth = $state(0)

  const displayTitle = $derived(currentTitle.trim())
  const viewTitle = $derived(
    displayTitle || (canManageCanvas ? 'Select Canvas' : 'Canvas')
  )
  const estimatedTitleWidth = $derived.by(() => {
    const titleLength = viewTitle.length
    return (
      titleLength * ESTIMATED_TITLE_CHAR_PX +
      Math.max(0, titleLength - 1) * ESTIMATED_TITLE_LETTER_SPACING_PX
    )
  })
  const titleWidthPx = $derived.by(() => {
    return Math.min(
      TITLE_EDIT_WIDTH_PX,
      Math.ceil(
        (titleMeasureWidth || estimatedTitleWidth) + TITLE_LAYER_CHROME_PX
      )
    )
  })

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownEl &&
        event.target instanceof Node &&
        !dropdownEl.contains(event.target)
      ) {
        showCanvasSelector = false
      }

      if (
        isEditingTitle &&
        titleEditorEl &&
        event.target instanceof Node &&
        !titleEditorEl.contains(event.target)
      ) {
        void commitTitleEdit()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, {
      capture: true
    })
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, {
        capture: true
      })
  })

  function beginTitleEdit() {
    if (!canManageCanvas) {
      return
    }

    editedTitle = currentTitle
    isEditingTitle = true
    queueMicrotask(() => {
      titleInputEl?.focus()
      titleInputEl?.select()
    })
  }

  function cancelTitleEdit() {
    editedTitle = currentTitle
    isEditingTitle = false
  }

  async function commitTitleEdit() {
    if (!isEditingTitle || isSavingTitle) {
      return
    }

    const nextTitle = editedTitle.trim()
    if (!nextTitle || nextTitle === currentTitle.trim()) {
      cancelTitleEdit()
      return
    }

    isSavingTitle = true
    try {
      await onTitleSave(nextTitle)
      isEditingTitle = false
    } finally {
      isSavingTitle = false
    }
  }
</script>

<div class="fixed left-4 top-4 z-30 flex items-start gap-3">
  <div class="flex flex-col gap-2">
    {#if showNavigation}
      <a
        href="/"
        class="toolbar-pill toolbar-button"
        aria-label="Back to dashboard"
      >
        <House class="size-5" aria-hidden="true" />
      </a>
    {/if}
    <CanvasToolbar {selectedTool} {readOnly} {onToolChange} />
  </div>

  <div class="flex items-start gap-2">
    {#if canManageCanvas}
      <div
        bind:this={titleEditorEl}
        class="canvas-title-shell toolbar-pill"
        class:canvas-title-shell--editing={isEditingTitle}
        style={`--canvas-title-display-width:${titleWidthPx}px`}
      >
        <span
          bind:clientWidth={titleMeasureWidth}
          class="canvas-title-measure"
          aria-hidden="true"
        >
          {viewTitle}
        </span>
        <button
          type="button"
          class="canvas-title-layer canvas-title-view"
          tabindex={isEditingTitle ? -1 : 0}
          aria-hidden={isEditingTitle}
          aria-label={`Canvas title: ${viewTitle}. Click to edit.`}
          onclick={beginTitleEdit}
        >
          <span class="canvas-title-text">
            {viewTitle}
          </span>
        </button>
        <input
          bind:this={titleInputEl}
          class="canvas-title-layer canvas-title-input"
          bind:value={editedTitle}
          tabindex={isEditingTitle ? 0 : -1}
          aria-hidden={!isEditingTitle}
          aria-label="Canvas title"
          readonly={!isEditingTitle || isSavingTitle}
          onblur={() => void commitTitleEdit()}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              void commitTitleEdit()
            } else if (event.key === 'Escape') {
              cancelTitleEdit()
            }
          }}
        />
      </div>
    {:else}
      <span
        class="canvas-title-shell canvas-title-shell--static toolbar-pill"
        style={`--canvas-title-display-width:${titleWidthPx}px`}
      >
        <span
          bind:clientWidth={titleMeasureWidth}
          class="canvas-title-measure"
          aria-hidden="true"
        >
          {viewTitle}
        </span>
        <span class="canvas-title-layer canvas-title-view">
          <span class="canvas-title-text">
            {viewTitle}
          </span>
        </span>
      </span>
    {/if}

    {#if showNavigation}
      <div bind:this={dropdownEl} class="relative">
        <button
          type="button"
          class="toolbar-pill toolbar-button"
          onclick={() => (showCanvasSelector = !showCanvasSelector)}
          aria-label="Switch canvas"
          aria-expanded={showCanvasSelector}
          aria-haspopup="menu"
        >
          <ChevronDown class="size-4" aria-hidden="true" />
        </button>
        {#if showCanvasSelector}
          <div
            class="absolute left-0 top-full mt-1 min-w-[200px] rounded-lg border border-border/70 bg-popover text-popover-foreground shadow-xl"
            role="menu"
          >
            <div class="max-h-[300px] overflow-y-auto p-1">
              {#if canvases.length > 0}
                {#each canvases as canvas}
                  <button
                    type="button"
                    class={`w-full rounded px-3 py-2 text-left text-sm font-medium transition ${
                      canvas.id === activeCanvasId
                        ? 'bg-primary text-primary-foreground'
                        : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                    role="menuitem"
                    onclick={() => {
                      showCanvasSelector = false
                      if (canvas.id !== activeCanvasId) {
                        void goto(`/canvas/${canvas.id}`)
                      }
                    }}
                  >
                    {canvas.title.trim().length > 15
                      ? canvas.title.trim().slice(0, 15) + '…'
                      : canvas.title.trim()}
                  </button>
                {/each}
              {:else if isLoadingCanvases}
                <div class="px-3 py-2 text-sm text-muted-foreground">
                  Loading canvases...
                </div>
              {:else}
                <div class="px-3 py-2 text-sm text-muted-foreground">
                  No canvases yet
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Local CSS keeps the measured runtime width and edit-state transition together. */
  .canvas-title-shell {
    --canvas-title-edit-width: 13rem;
    display: block;
    height: 2.25rem;
    overflow: hidden;
    position: relative;
    transition:
      width 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
      border-color 160ms ease,
      background-color 160ms ease,
      box-shadow 160ms ease;
    width: var(--canvas-title-display-width);
  }

  .canvas-title-measure {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    line-height: 1;
    pointer-events: none;
    position: absolute;
    text-transform: uppercase;
    visibility: hidden;
    white-space: nowrap;
  }

  .canvas-title-shell--editing {
    width: var(--canvas-title-edit-width);
  }

  .canvas-title-layer {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    display: flex;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    inset: 0;
    letter-spacing: 0.18em;
    line-height: 1;
    min-width: 0;
    padding: 0 0.75rem;
    position: absolute;
    text-align: left;
    text-transform: uppercase;
    transition:
      opacity 140ms ease,
      transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    width: 100%;
  }

  .canvas-title-view {
    opacity: 1;
    transform: translateX(0);
  }

  .canvas-title-input {
    opacity: 0;
    outline: none;
    pointer-events: none;
    transform: translateX(0.75rem);
  }

  .canvas-title-shell--editing .canvas-title-view {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-0.75rem);
  }

  .canvas-title-shell--editing .canvas-title-input {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
  }

  .canvas-title-text,
  .canvas-title-shell--static .canvas-title-view {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .canvas-title-shell,
    .canvas-title-layer {
      transition: none;
    }
  }
</style>
