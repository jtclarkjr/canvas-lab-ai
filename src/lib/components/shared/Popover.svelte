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
    trigger,
    children
  } = $props<{
    open?: boolean
    id: string
    label?: string
    role?: 'dialog' | 'menu'
    align?: 'start' | 'center' | 'end'
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
    const handleClick = (event: MouseEvent) => {
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

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClick)
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
        'popover-shell absolute top-full z-30 mt-2 min-w-[260px]',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0'
      )}
    >
      {@render children?.()}
    </div>
  {/if}
</div>
