<script lang="ts">
  import { onMount } from 'svelte'
  import { cn } from '$lib/utils'

  type PopoverRenderProps = {
    id: string
    expanded: boolean
  }

  let {
    open = $bindable(false),
    id,
    label = 'Options',
    role = 'dialog',
    align = 'center',
    side = 'bottom',
    trigger,
    children
  } = $props<{
    open?: boolean
    id: string
    label?: string
    role?: 'dialog' | 'menu'
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'bottom'
    trigger?: (props: PopoverRenderProps) => unknown
    children?: () => unknown
  }>()

  let root = $state<HTMLDivElement | null>(null)

  function focusTrigger() {
    root
      ?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      ?.focus()
  }

  function closePopover(restoreFocus = false) {
    open = false
    if (restoreFocus) {
      queueMicrotask(focusTrigger)
    }
  }

  onMount(() => {
    // pointerdown instead of mousedown: the canvas calls preventDefault() on
    // pointerdown, which suppresses the derived mouse events — clicks on the
    // drawing surface would never reach a mousedown listener.
    const handlePointerDown = (event: PointerEvent) => {
      if (!open || !root) {
        return
      }

      if (!root.contains(event.target as Node)) {
        closePopover()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closePopover(true)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  })
</script>

<div bind:this={root} class="relative">
  <div>
    {@render trigger?.({ id, expanded: open })}
  </div>

  {#if open}
    <div
      {id}
      {role}
      aria-label={label}
      class={cn(
        'popover-shell absolute z-30 min-w-[260px]',
        side === 'bottom' && 'top-full mt-2',
        side === 'top' && 'bottom-full mb-2',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0'
      )}
    >
      {@render children?.()}
    </div>
  {/if}
</div>
