<script lang="ts" module>
  import type { Snippet } from 'svelte'

  export type DialogProps = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onkeydown?: (event: KeyboardEvent) => void
    title: string
    eyebrow?: string
    description?: string
    widthClass?: string
    showClose?: boolean
    closeLabel?: string
    closeOnOutside?: boolean
    closeOnEscape?: boolean
    hideHeader?: boolean
    class?: string
    children?: Snippet
    footer?: Snippet
  }
</script>

<script lang="ts">
  import { Dialog as BitsDialog } from 'bits-ui'
  import { X } from 'lucide-svelte'
  import { cn } from '$lib/utils'
  import IconButton from '../actions/IconButton.svelte'

  let {
    open = $bindable(false),
    onOpenChange,
    onkeydown,
    title,
    eyebrow = '',
    description,
    widthClass = 'max-w-lg',
    showClose = false,
    closeLabel = 'Close dialog',
    closeOnOutside = true,
    closeOnEscape = true,
    hideHeader = false,
    class: className,
    children,
    footer
  }: DialogProps = $props()
</script>

<BitsDialog.Root bind:open {onOpenChange}>
  <BitsDialog.Portal>
    <BitsDialog.Overlay
      class="ui-dialog-overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
    />
    <BitsDialog.Content
      {onkeydown}
      class={cn(
        'ui-dialog-content glass-card surface-border fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] p-6 outline-none',
        widthClass,
        className
      )}
      onInteractOutside={(event) => {
        if (!closeOnOutside) event.preventDefault()
      }}
      onEscapeKeydown={(event) => {
        if (!closeOnEscape) event.preventDefault()
      }}
    >
      {#if hideHeader}
        <BitsDialog.Title class="sr-only">{title}</BitsDialog.Title>
        {#if description}
          <BitsDialog.Description class="sr-only">
            {description}
          </BitsDialog.Description>
        {/if}
        {#if showClose}
          <BitsDialog.Close>
            {#snippet child({ props })}
              <IconButton
                {...props}
                label={closeLabel}
                variant="secondary"
                class="absolute right-3 top-3 z-10 size-10"
              >
                <X class="size-4" aria-hidden="true" />
              </IconButton>
            {/snippet}
          </BitsDialog.Close>
        {/if}
      {:else}
        <div class="mb-5 flex min-w-0 items-start justify-between gap-4">
          <div class="grid min-w-0 flex-1 gap-1">
            {#if eyebrow}
              <p
                class="truncate text-xs font-black uppercase tracking-[0.24em] text-foreground"
                title={eyebrow}
              >
                {eyebrow}
              </p>
            {/if}
            <BitsDialog.Title
              class="truncate text-2xl font-bold text-foreground"
              {title}
            >
              {title}
            </BitsDialog.Title>
            {#if description}
              <BitsDialog.Description class="text-sm text-muted-foreground">
                {description}
              </BitsDialog.Description>
            {/if}
          </div>
          {#if showClose}
            <BitsDialog.Close>
              {#snippet child({ props })}
                <IconButton
                  {...props}
                  label={closeLabel}
                  variant="secondary"
                  class="size-10"
                >
                  <X class="size-4" aria-hidden="true" />
                </IconButton>
              {/snippet}
            </BitsDialog.Close>
          {/if}
        </div>
      {/if}

      {@render children?.()}

      {#if footer}
        <div class="mt-6 flex justify-end gap-2">
          {@render footer()}
        </div>
      {/if}
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>

<style>
  :global(.ui-dialog-overlay[data-state='open']) {
    animation: ui-dialog-overlay-in 200ms ease-out;
  }

  :global(.ui-dialog-overlay[data-state='closed']) {
    animation: ui-dialog-overlay-out 160ms ease-in;
  }

  :global(.ui-dialog-content[data-state='open']) {
    animation: ui-dialog-content-in 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(.ui-dialog-content[data-state='closed']) {
    animation: ui-dialog-content-out 160ms ease-in;
  }

  @keyframes ui-dialog-overlay-in {
    from {
      opacity: 0;
    }
  }

  @keyframes ui-dialog-overlay-out {
    to {
      opacity: 0;
    }
  }

  @keyframes ui-dialog-content-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  @keyframes ui-dialog-content-out {
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.ui-dialog-overlay),
    :global(.ui-dialog-content) {
      animation-duration: 0.01ms !important;
    }
  }
</style>
