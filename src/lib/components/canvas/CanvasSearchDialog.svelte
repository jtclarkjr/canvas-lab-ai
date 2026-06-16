<script lang="ts">
  import { FileText, LoaderCircle, Search } from 'lucide-svelte'
  import { fade, scale } from 'svelte/transition'
  import {
    DEFAULT_CANVAS_SEARCH_LIMIT,
    getCanvasSearchResults,
    getCanvasTitle
  } from '$lib/canvas/search'
  import type { Canvas } from '$lib/canvas/schema'
  import RoleBadge from '$lib/components/shared/RoleBadge.svelte'

  let {
    open = $bindable(false),
    canvases = [],
    isLoading = false,
    openingCanvasId = null,
    onSelect
  } = $props<{
    open?: boolean
    canvases?: Canvas[]
    isLoading?: boolean
    openingCanvasId?: string | null
    onSelect?: (canvas: Canvas) => void | Promise<void>
  }>()

  let inputEl = $state<HTMLInputElement | null>(null)
  let query = $state('')
  let selectedIndex = $state(-1)

  const searchResults = $derived(
    getCanvasSearchResults(canvases, query, DEFAULT_CANVAS_SEARCH_LIMIT)
  )
  const normalizedQuery = $derived(query.trim())
  const showingRecent = $derived(normalizedQuery.length === 0)
  const hasResults = $derived(searchResults.length > 0)
  const titleId = `canvas-search-title-${Math.random().toString(36).slice(2)}`
  const listId = `canvas-search-list-${Math.random().toString(36).slice(2)}`

  $effect(() => {
    if (!open) return

    query = ''
    queueMicrotask(() => {
      inputEl?.focus()
      inputEl?.select()
    })
  })

  $effect(() => {
    const count = searchResults.length
    selectedIndex = count > 0 ? 0 : -1
  })

  function formatCanvasDate(dateString: string | null | undefined): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  function closeDialog() {
    open = false
  }

  function selectCanvas(canvas: Canvas | undefined) {
    if (!canvas || openingCanvasId) return

    open = false
    void onSelect?.(canvas)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
      return
    }

    if (!hasResults) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedIndex = (selectedIndex + 1) % searchResults.length
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedIndex =
        (selectedIndex - 1 + searchResults.length) % searchResults.length
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectCanvas(searchResults[selectedIndex]?.canvas)
    }
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node)

    return {
      destroy() {
        node.parentNode?.removeChild(node)
      }
    }
  }
</script>

{#if open}
  <div
    use:portal
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/45 backdrop-blur-sm"
      onclick={closeDialog}
      aria-label="Close search"
      tabindex="-1"
      transition:fade={{ duration: 140 }}
    ></button>

    <div
      class="relative z-10 flex max-h-[min(32rem,calc(100dvh-2rem))] w-[calc(100vw-1rem)] max-w-[680px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl sm:rounded-[1.75rem]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      onkeydown={handleKeyDown}
      transition:scale={{ duration: 160, start: 0.96 }}
    >
      <h2 id={titleId} class="sr-only">Search canvases</h2>

      <div
        class="flex min-h-14 items-center gap-3 border-b border-border/70 px-4 sm:min-h-16 sm:px-5"
      >
        <Search class="size-5 shrink-0 text-muted-foreground" />
        <input
          bind:this={inputEl}
          bind:value={query}
          class="min-w-0 flex-1 bg-transparent py-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
          type="search"
          placeholder="Search canvases"
          autocomplete="off"
          spellcheck="false"
          role="combobox"
          aria-label="Search canvases"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={selectedIndex >= 0
            ? `${listId}-${searchResults[selectedIndex]?.canvas.id}`
            : undefined}
        />
      </div>

      <div
        id={listId}
        class="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3"
        role="listbox"
      >
        {#if isLoading && canvases.length === 0}
          <div class="grid gap-2">
            {#each Array.from({ length: 5 }) as _, index (index)}
              <div
                class="flex min-h-16 items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-3"
              >
                <div
                  class="size-10 shrink-0 animate-pulse rounded-lg bg-secondary"
                ></div>
                <div class="min-w-0 flex-1">
                  <div
                    class="h-4 w-2/3 animate-pulse rounded bg-secondary"
                  ></div>
                  <div
                    class="mt-2 h-3 w-24 animate-pulse rounded bg-secondary"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if hasResults}
          <p
            class="m-0 px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground"
          >
            {showingRecent ? 'Recent canvases' : 'Matching canvases'}
          </p>
          <div class="grid gap-2">
            {#each searchResults as result, index (result.canvas.id)}
              <button
                id={`${listId}-${result.canvas.id}`}
                type="button"
                role="option"
                aria-selected={selectedIndex === index}
                class={`group flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  selectedIndex === index
                    ? 'border-primary/40 bg-accent text-accent-foreground'
                    : 'border-transparent hover:border-border/80 hover:bg-secondary/70'
                }`}
                onmouseenter={() => (selectedIndex = index)}
                onclick={() => selectCanvas(result.canvas)}
              >
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-inner"
                >
                  <FileText class="size-5" aria-hidden="true" />
                </div>

                <div class="min-w-0 flex-1">
                  <div
                    class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    <span
                      class="min-w-0 max-w-full truncate text-sm font-semibold text-foreground"
                    >
                      {getCanvasTitle(result.canvas)}
                    </span>
                    {#if result.canvas.role && result.canvas.role !== 'owner'}
                      <RoleBadge role={result.canvas.role} />
                    {/if}
                  </div>
                  <div
                    class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
                  >
                    <span class="truncate"
                      >{formatCanvasDate(result.canvas.createdAt)}</span
                    >
                    {#if result.canvas.visibility === 'public'}
                      <span aria-hidden="true">Public</span>
                    {/if}
                  </div>
                </div>

                {#if openingCanvasId === result.canvas.id}
                  <LoaderCircle
                    class="size-4 shrink-0 animate-spin text-primary"
                    aria-hidden="true"
                  />
                {/if}
              </button>
            {/each}
          </div>
        {:else}
          <div
            class="flex min-h-48 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground"
          >
            {showingRecent ? 'No canvases yet.' : 'No matching canvases.'}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
