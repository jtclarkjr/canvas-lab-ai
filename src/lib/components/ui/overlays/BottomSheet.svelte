<script lang="ts" module>
  import type { Snippet } from 'svelte'

  export type BottomSheetProps = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    description?: string
    heightClass?: string
    layerClass?: string
    class?: string
    overlayClass?: string
    handleLabel?: string
    dismissThreshold?: number
    draggable?: boolean
    closeOnOutside?: boolean
    closeOnEscape?: boolean
    header?: Snippet
    children?: Snippet
    footer?: Snippet
  }
</script>

<script lang="ts">
  import { Dialog as BitsDialog } from 'bits-ui'
  import { cn } from '$lib/utils'

  let {
    open = $bindable(false),
    onOpenChange,
    title,
    description,
    heightClass = 'h-[94dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] min-h-[20rem]',
    layerClass = 'z-50',
    class: className,
    overlayClass,
    handleLabel = 'Drag down to close',
    dismissThreshold = 80,
    draggable = true,
    closeOnOutside = true,
    closeOnEscape = true,
    header,
    children,
    footer
  }: BottomSheetProps = $props()

  let dragPointerId: number | null = null
  let dragStartX = 0
  let dragStartY = 0
  let dragStartScrollable: HTMLElement | null = null
  let dragActive = false
  let dragY = $state(0)
  let dragging = $state(false)

  const sheetStyle = $derived(`transform:translateY(${dragY}px)`)

  function requestClose() {
    dragY = 0
    open = false
    onOpenChange?.(false)
  }

  function closestScrollable(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return null

    let current: HTMLElement | null = target
    while (current) {
      const style = window.getComputedStyle(current)
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight
      ) {
        return current
      }
      if (current.hasAttribute('data-bottom-sheet-content')) return null
      current = current.parentElement
    }
    return null
  }

  function handleDragStart(event: PointerEvent) {
    if (!draggable || event.button !== 0) return
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY - dragY
    dragStartScrollable = closestScrollable(event.target)
    dragActive = false
    dragging = false
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return

    const deltaX = event.clientX - dragStartX
    const deltaY = event.clientY - dragStartY
    if (!dragActive) {
      if (
        deltaY <= 10 ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        (dragStartScrollable && dragStartScrollable.scrollTop > 0)
      ) {
        return
      }
      dragActive = true
      dragging = true
    }

    event.preventDefault()
    dragY = Math.max(0, deltaY)
  }

  function handleDragEnd(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return
    dragging = false
    dragActive = false
    dragStartScrollable = null
    dragPointerId = null

    if (dragY > dismissThreshold) {
      requestClose()
      return
    }
    dragY = 0
  }
</script>

<BitsDialog.Root bind:open {onOpenChange}>
  <BitsDialog.Portal>
    <BitsDialog.Overlay
      class={cn(
        'ui-bottom-sheet-overlay fixed inset-0 bg-black/30',
        layerClass,
        overlayClass
      )}
    />
    <BitsDialog.Content
      class={cn(
        'ui-bottom-sheet-content fixed inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card text-card-foreground shadow-2xl outline-none',
        !dragging && 'transition-transform duration-150',
        layerClass,
        heightClass,
        className
      )}
      style={sheetStyle}
      onInteractOutside={(event) => {
        if (!closeOnOutside) event.preventDefault()
      }}
      onEscapeKeydown={(event) => {
        if (!closeOnEscape) event.preventDefault()
      }}
      onpointerdown={handleDragStart}
      onpointermove={handleDragMove}
      onpointerup={handleDragEnd}
      onpointercancel={handleDragEnd}
      data-bottom-sheet-content
      data-camera-exempt
    >
      <BitsDialog.Title class="sr-only">{title}</BitsDialog.Title>
      {#if description}
        <BitsDialog.Description class="sr-only"
          >{description}</BitsDialog.Description
        >
      {/if}

      <div class="shrink-0">
        <button
          type="button"
          class="mx-auto block h-8 w-16 touch-none rounded-full"
          onclick={requestClose}
          aria-label={handleLabel}
        >
          <span
            class="mx-auto block h-1 w-10 rounded-full bg-muted-foreground/30"
          ></span>
        </button>
        {@render header?.()}
      </div>

      <div class="flex min-h-0 flex-1 flex-col">
        {@render children?.()}
      </div>

      {@render footer?.()}
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>

<style>
  :global(.ui-bottom-sheet-overlay[data-state='open']) {
    animation: ui-bottom-sheet-fade-in 120ms ease-out;
  }

  :global(.ui-bottom-sheet-overlay[data-state='closed']) {
    animation: ui-bottom-sheet-fade-out 100ms ease-in;
  }

  :global(.ui-bottom-sheet-content[data-state='open']) {
    animation: ui-bottom-sheet-slide-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(.ui-bottom-sheet-content[data-state='closed']) {
    animation: ui-bottom-sheet-slide-out 140ms ease-in;
  }

  @keyframes ui-bottom-sheet-fade-in {
    from {
      opacity: 0;
    }
  }

  @keyframes ui-bottom-sheet-fade-out {
    to {
      opacity: 0;
    }
  }

  @keyframes ui-bottom-sheet-slide-in {
    from {
      transform: translateY(2.25rem);
      opacity: 0;
    }
  }

  @keyframes ui-bottom-sheet-slide-out {
    to {
      transform: translateY(2.25rem);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.ui-bottom-sheet-overlay),
    :global(.ui-bottom-sheet-content) {
      animation-duration: 0.01ms !important;
    }
  }
</style>
