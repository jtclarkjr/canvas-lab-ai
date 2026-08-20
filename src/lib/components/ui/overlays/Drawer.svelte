<script lang="ts" module>
  import type { Snippet } from 'svelte'

  export type DrawerProps = {
    id?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    description?: string
    widthClass?: string
    layerClass?: string
    class?: string
    closeLabel?: string
    closeOnOutside?: boolean
    closeOnEscape?: boolean
    headerActions?: Snippet
    children?: Snippet
  }
</script>

<script lang="ts">
  import { Dialog as BitsDialog } from 'bits-ui'
  import { X } from 'lucide-svelte'
  import { cn } from '$lib/utils'
  import IconButton from '../actions/IconButton.svelte'

  let {
    id,
    open = $bindable(false),
    onOpenChange,
    title,
    description,
    widthClass = 'w-[min(28rem,calc(100vw-2rem))]',
    layerClass = 'z-50',
    class: className,
    closeLabel = 'Close drawer',
    closeOnOutside = true,
    closeOnEscape = true,
    headerActions,
    children
  }: DrawerProps = $props()

  function closeFromBackdrop() {
    if (!closeOnOutside) return
    open = false
    onOpenChange?.(false)
  }
</script>

<BitsDialog.Root bind:open {onOpenChange}>
  <BitsDialog.Portal>
    <BitsDialog.Overlay
      class={cn(
        'ui-drawer-overlay fixed inset-0 bg-background/20 backdrop-blur-[1px]',
        layerClass
      )}
      data-drawer-backdrop
      onclick={closeFromBackdrop}
    />
    <BitsDialog.Content
      {id}
      aria-label={title}
      class={cn(
        'ui-drawer-content fixed right-0 top-0 flex h-dvh flex-col border-l border-border/70 bg-card/95 text-card-foreground shadow-2xl outline-none backdrop-blur-xl',
        layerClass,
        widthClass,
        className
      )}
      onInteractOutside={(event) => {
        if (!closeOnOutside) event.preventDefault()
      }}
      onEscapeKeydown={(event) => {
        if (!closeOnEscape) event.preventDefault()
      }}
      data-camera-exempt
    >
      <header
        class="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4"
      >
        <div class="min-w-0 flex-1">
          <BitsDialog.Title
            class="m-0 truncate text-sm font-semibold text-foreground"
          >
            {title}
          </BitsDialog.Title>
          {#if description}
            <BitsDialog.Description
              class="m-0 truncate text-xs text-muted-foreground"
            >
              {description}
            </BitsDialog.Description>
          {/if}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          {@render headerActions?.()}
          <BitsDialog.Close>
            {#snippet child({ props })}
              <IconButton
                {...props}
                label={closeLabel}
                variant="ghost"
                class="size-9 rounded-full"
              >
                <X class="size-4" aria-hidden="true" />
              </IconButton>
            {/snippet}
          </BitsDialog.Close>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col">
        {@render children?.()}
      </div>
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>

<style>
  :global(.ui-drawer-overlay[data-state='open']) {
    animation: ui-drawer-fade-in 140ms ease-out;
  }

  :global(.ui-drawer-overlay[data-state='closed']) {
    animation: ui-drawer-fade-out 120ms ease-in;
  }

  :global(.ui-drawer-content[data-state='open']) {
    animation: ui-drawer-slide-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(.ui-drawer-content[data-state='closed']) {
    animation: ui-drawer-slide-out 140ms ease-in;
  }

  @keyframes ui-drawer-fade-in {
    from {
      opacity: 0;
    }
  }

  @keyframes ui-drawer-fade-out {
    to {
      opacity: 0;
    }
  }

  @keyframes ui-drawer-slide-in {
    from {
      transform: translateX(3rem);
      opacity: 0;
    }
  }

  @keyframes ui-drawer-slide-out {
    to {
      transform: translateX(3rem);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.ui-drawer-overlay),
    :global(.ui-drawer-content) {
      animation-duration: 0.01ms !important;
    }
  }
</style>
