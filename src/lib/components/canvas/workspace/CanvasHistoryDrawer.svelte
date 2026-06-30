<script lang="ts">
  import { fly } from 'svelte/transition'
  import {
    Clock3,
    LoaderCircle,
    Pencil,
    Plus,
    Redo2,
    RefreshCw,
    Trash2,
    Undo2,
    X
  } from 'lucide-svelte'
  import { supabase } from '$lib/auth/session-store'
  import { listCanvasHistory } from '$lib/workspace/api'
  import {
    getCanvasHistoryActionLabel,
    toCanvasHistoryEntry
  } from '$lib/workspace/canvas-history'
  import type { CanvasHistoryEntry } from '$lib/workspace/schema'
  import VirtualizedMessageList from '$lib/components/shared/VirtualizedMessageList.svelte'

  const PAGE_SIZE = 50

  let {
    canvasId,
    id = 'canvas-history-drawer',
    open = $bindable(false)
  } = $props<{
    canvasId: string
    id?: string
    open?: boolean
  }>()

  let entries = $state<CanvasHistoryEntry[]>([])
  let nextBefore = $state<string | null>(null)
  let isLoading = $state(false)
  let isLoadingMore = $state(false)
  let error = $state<string | null>(null)
  let requestedCanvasId = $state<string | null>(null)
  let requestId = 0

  const hasMore = $derived(nextBefore !== null)

  function mergeEntries(nextEntries: CanvasHistoryEntry[]) {
    const seen = new Set<string>()
    return nextEntries.filter((entry) => {
      if (seen.has(entry.id)) {
        return false
      }
      seen.add(entry.id)
      return true
    })
  }

  async function loadHistory(reset = true) {
    if (!canvasId || (!reset && !nextBefore)) {
      return
    }

    const activeRequestId = ++requestId
    const activeCanvasId = canvasId
    error = null
    if (reset) {
      isLoading = true
    } else {
      isLoadingMore = true
    }

    try {
      const response = await listCanvasHistory(activeCanvasId, {
        limit: PAGE_SIZE,
        before: reset ? null : nextBefore
      })
      if (activeRequestId !== requestId || activeCanvasId !== canvasId) {
        return
      }
      entries = reset
        ? response.items
        : mergeEntries([...entries, ...response.items])
      nextBefore = response.nextBefore
    } catch (cause) {
      if (activeRequestId === requestId) {
        error =
          cause instanceof Error ? cause.message : 'Failed to load history.'
      }
    } finally {
      if (activeRequestId === requestId) {
        isLoading = false
        isLoadingMore = false
      }
    }
  }

  function actorLabel(entry: CanvasHistoryEntry) {
    return entry.actor.name || entry.actor.email || 'Unknown user'
  }

  function timeLabel(iso: string) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return iso
    }

    return new Intl.DateTimeFormat([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date)
  }

  $effect(() => {
    if (!open || !canvasId || requestedCanvasId === canvasId) {
      return
    }

    requestedCanvasId = canvasId
    entries = []
    nextBefore = null
    void loadHistory(true)
  })

  $effect(() => {
    const client = supabase
    if (!open || !client || !canvasId) {
      return
    }

    const activeCanvasId = canvasId
    const channel = client
      .channel(`canvas:${activeCanvasId}:history`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_history',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          try {
            const entry = toCanvasHistoryEntry(payload.new)
            if (entry.canvasId !== activeCanvasId) {
              return
            }
            entries = mergeEntries([entry, ...entries])
          } catch {
            // Ignore malformed realtime payloads; the next refresh revalidates.
          }
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })
</script>

{#if open}
  <div
    {id}
    class="fixed right-0 top-0 z-50 flex h-screen w-[min(28rem,calc(100vw-2rem))] flex-col border-l border-border/70 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl"
    role="dialog"
    aria-label="Canvas history"
    data-camera-exempt
    transition:fly={{ x: 48, duration: 180 }}
  >
    <header
      class="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-4"
    >
      <div class="min-w-0">
        <h2 class="m-0 text-sm font-semibold text-foreground">
          Canvas history
        </h2>
        <p class="m-0 truncate text-xs text-muted-foreground">
          Element activity for this canvas
        </p>
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
          onclick={() => void loadHistory(true)}
          disabled={isLoading}
          aria-label="Refresh canvas history"
        >
          <RefreshCw
            class={`size-4 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onclick={() => (open = false)}
          aria-label="Close canvas history"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col">
      {#if isLoading && entries.length === 0}
        <div class="grid gap-2 px-3 py-3" aria-hidden="true">
          {#each Array.from({ length: 6 }) as _, index (index)}
            <div
              class="flex min-h-16 items-start gap-3 rounded-lg border border-border/50 bg-muted/25 px-3 py-3"
            >
              <div class="size-8 animate-pulse rounded-full bg-secondary"></div>
              <div class="min-w-0 flex-1">
                <div class="h-4 w-2/3 animate-pulse rounded bg-secondary"></div>
                <div
                  class="mt-2 h-3 w-1/2 animate-pulse rounded bg-secondary/80"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {:else if error && entries.length === 0}
        <div
          class="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-3 py-3 text-center"
        >
          <p class="m-0 text-sm font-medium text-foreground">{error}</p>
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            onclick={() => void loadHistory(true)}
          >
            Try again
          </button>
        </div>
      {:else if entries.length === 0}
        <div
          class="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-3 py-3 text-center text-muted-foreground"
        >
          <Clock3 class="size-5" aria-hidden="true" />
          <p class="m-0 text-sm">No element history yet.</p>
        </div>
      {:else}
        <VirtualizedMessageList
          items={entries}
          keyForItem={(entry) => entry.id}
          estimateSize={76}
          gap={8}
          active={open}
          anchorTo="start"
          initialScroll="start"
          followMode="none"
          className="px-3 py-3"
        >
          {#snippet item(entry)}
            <article
              class="flex min-h-16 items-start gap-3 rounded-lg border border-border/50 bg-background/45 px-3 py-3"
            >
              <span
                class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                aria-hidden="true"
              >
                {#if entry.action === 'created'}
                  <Plus class="size-4" />
                {:else if entry.action === 'modified'}
                  <Pencil class="size-4" />
                {:else if entry.action === 'deleted'}
                  <Trash2 class="size-4" />
                {:else if entry.action === 'undo'}
                  <Undo2 class="size-4" />
                {:else}
                  <Redo2 class="size-4" />
                {/if}
              </span>
              <div class="min-w-0 flex-1">
                <p class="m-0 truncate text-sm font-semibold text-foreground">
                  {getCanvasHistoryActionLabel(entry)}
                </p>
                <p class="m-0 mt-1 truncate text-xs text-muted-foreground">
                  {actorLabel(entry)} · {timeLabel(entry.createdAt)}
                </p>
              </div>
            </article>
          {/snippet}

          {#snippet after()}
            <div class="mt-3 flex justify-center">
              {#if hasMore}
                <button
                  type="button"
                  class="inline-flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  onclick={() => void loadHistory(false)}
                  disabled={isLoadingMore}
                >
                  {#if isLoadingMore}
                    <LoaderCircle
                      class="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  {/if}
                  Load more
                </button>
              {/if}
            </div>
          {/snippet}
        </VirtualizedMessageList>
      {/if}
    </div>
  </div>
{/if}
