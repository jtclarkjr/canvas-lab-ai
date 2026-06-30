<script lang="ts" generics="Item">
  import { createVirtualizer } from '@tanstack/svelte-virtual'
  import type { Snippet } from 'svelte'
  import { get } from 'svelte/store'
  import { cn } from '$lib/utils'

  type ScrollAnchor = 'start' | 'end'
  type FollowMode = 'none' | 'when-at-end' | 'always'
  type ScrollToEndBehavior = 'auto' | 'smooth' | 'instant'

  let {
    items,
    keyForItem,
    estimateSize = 72,
    overscan = 8,
    gap = 12,
    active = true,
    anchorTo = 'end',
    initialScroll = anchorTo,
    followMode = 'when-at-end',
    followKey = '',
    scrollEndThreshold = 32,
    className = '',
    listClassName = '',
    itemClassName = '',
    item,
    empty,
    before,
    after
  } = $props<{
    items: Item[]
    keyForItem: (item: Item, index: number) => string | number
    estimateSize?: number
    overscan?: number
    gap?: number
    active?: boolean
    anchorTo?: ScrollAnchor
    initialScroll?: ScrollAnchor
    followMode?: FollowMode
    followKey?: unknown
    scrollEndThreshold?: number
    className?: string
    listClassName?: string
    itemClassName?: string
    item: Snippet<[Item, number]>
    empty?: Snippet
    before?: Snippet
    after?: Snippet
  }>()

  let scrollEl = $state<HTMLDivElement | null>(null)
  let pinnedToEnd = $state(true)

  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: 0,
    getScrollElement: () => scrollEl,
    estimateSize: () => estimateSize,
    getItemKey: (index) => {
      const value = items[index]
      return value === undefined ? index : keyForItem(value, index)
    },
    overscan: 8,
    gap: 12,
    anchorTo: 'end',
    followOnAppend: 'auto',
    scrollEndThreshold: 32
  })

  const virtualItems = $derived($virtualizer.getVirtualItems())
  const totalSize = $derived($virtualizer.getTotalSize())
  const firstVirtualStart = $derived(virtualItems[0]?.start ?? 0)

  $effect(() => {
    get(virtualizer).setOptions({
      count: items.length,
      getScrollElement: () => scrollEl,
      estimateSize: () => estimateSize,
      getItemKey: (index) => {
        const value = items[index]
        return value === undefined ? index : keyForItem(value, index)
      },
      overscan,
      gap,
      anchorTo,
      followOnAppend:
        anchorTo === 'end' && followMode !== 'none' ? 'auto' : false,
      scrollEndThreshold,
      useCachedMeasurements: !active
    })
  })

  function updatePinnedToEnd() {
    if (!scrollEl) {
      pinnedToEnd = true
      return
    }
    pinnedToEnd =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight <=
      scrollEndThreshold
  }

  function scrollToEnd(behavior: ScrollToEndBehavior = 'auto') {
    requestAnimationFrame(() => {
      get(virtualizer).scrollToEnd({ behavior })
      requestAnimationFrame(() => {
        if (!scrollEl) return
        scrollEl.scrollTo({
          top: scrollEl.scrollHeight,
          behavior: behavior === 'instant' ? 'auto' : behavior
        })
        pinnedToEnd = true
      })
    })
  }

  function scrollToStart(behavior: ScrollToEndBehavior = 'auto') {
    requestAnimationFrame(() => {
      get(virtualizer).scrollToOffset(0, {
        align: 'start',
        behavior: behavior === 'instant' ? 'auto' : behavior
      })
      requestAnimationFrame(() => {
        if (!scrollEl) return
        scrollEl.scrollTo({
          top: 0,
          behavior: behavior === 'instant' ? 'auto' : behavior
        })
        pinnedToEnd = false
      })
    })
  }

  function measureVirtualItem(node: HTMLDivElement) {
    get(virtualizer).measureElement(node)

    return {
      destroy() {
        get(virtualizer).measureElement(null)
      }
    }
  }

  let wasActive = false

  $effect(() => {
    if (active && !wasActive) {
      if (initialScroll === 'end') {
        scrollToEnd('instant')
      } else {
        scrollToStart('instant')
      }
    }
    wasActive = active
  })

  $effect(() => {
    void items.length
    void followKey

    if (!active) return
    if (followMode === 'none') return
    if (followMode === 'always' || pinnedToEnd) {
      scrollToEnd('auto')
    }
  })
</script>

<div
  bind:this={scrollEl}
  onscroll={updatePinnedToEnd}
  class={cn('min-h-0 flex-1 overflow-y-auto', className)}
>
  {@render before?.()}

  {#if items.length === 0}
    <div class="flex min-h-full flex-col">
      {@render empty?.()}
    </div>
  {:else}
    <div style={`position:relative;height:${totalSize}px;width:100%;`}>
      <div
        class={cn('flex flex-col', listClassName)}
        style={`position:absolute;top:0;left:0;width:100%;gap:${gap}px;transform:translateY(${firstVirtualStart}px);`}
      >
        {#each virtualItems as virtualItem (virtualItem.key)}
          {@const value = items[virtualItem.index]}
          {#if value !== undefined}
            <div
              use:measureVirtualItem
              data-index={virtualItem.index}
              class={itemClassName}
            >
              {@render item(value, virtualItem.index)}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  {@render after?.()}
</div>
