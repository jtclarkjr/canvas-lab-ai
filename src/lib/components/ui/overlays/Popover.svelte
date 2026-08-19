<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  export type PopoverRenderProps = {
    id: string
    expanded: boolean
    props: HTMLButtonAttributes
  }

  export type PopoverProps = {
    open?: boolean
    id: string
    label?: string
    role?: 'dialog' | 'menu'
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'bottom'
    sideOffset?: number
    trigger?: Snippet<[PopoverRenderProps]>
    children?: Snippet
  }
</script>

<script lang="ts">
  import { Popover as BitsPopover } from 'bits-ui'

  let {
    open = $bindable(false),
    id,
    label = 'Options',
    role = 'dialog',
    align = 'center',
    side = 'bottom',
    sideOffset = 8,
    trigger,
    children
  }: PopoverProps = $props()
</script>

<BitsPopover.Root bind:open>
  <BitsPopover.Trigger>
    {#snippet child({ props })}
      {@render trigger?.({ id, expanded: open, props })}
    {/snippet}
  </BitsPopover.Trigger>

  <BitsPopover.Portal>
    <BitsPopover.Content
      {id}
      {role}
      aria-label={label}
      {align}
      {side}
      {sideOffset}
      class="ui-popover-content popover-shell z-50 min-w-[260px] outline-none"
    >
      {@render children?.()}
    </BitsPopover.Content>
  </BitsPopover.Portal>
</BitsPopover.Root>

<style>
  :global(.ui-popover-content[data-state='open']) {
    animation: ui-popover-in 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(.ui-popover-content[data-state='closed']) {
    animation: ui-popover-out 150ms cubic-bezier(0.55, 0, 0.55, 0.2);
  }

  @keyframes ui-popover-in {
    from {
      opacity: 0;
      transform: scale(0.85);
    }
  }

  @keyframes ui-popover-out {
    to {
      opacity: 0;
      transform: scale(0.85);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.ui-popover-content) {
      animation-duration: 0.01ms !important;
    }
  }
</style>
