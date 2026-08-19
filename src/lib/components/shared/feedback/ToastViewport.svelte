<script lang="ts">
  import { X } from 'lucide-svelte'
  import { fly } from 'svelte/transition'
  import { Button, IconButton } from '$lib/components/ui'

  import { toast } from '$lib/stores/shared/toast.svelte'
</script>

<div
  class="pointer-events-none fixed right-4 bottom-6 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:w-full"
  aria-live="polite"
  aria-atomic="false"
>
  {#each toast.items as item (item.id)}
    <div
      transition:fly={{ y: 16, duration: 200 }}
      class={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
        item.variant === 'error'
          ? 'border-destructive/40 bg-popover text-destructive'
          : 'border-border bg-popover text-popover-foreground'
      }`}
      role={item.variant === 'error' ? 'alert' : 'status'}
    >
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold">{item.title}</p>
        {#if item.description}
          <p class="truncate text-xs text-muted-foreground">
            {item.description}
          </p>
        {/if}
      </div>
      {#if item.action}
        <Button
          size="sm"
          onclick={() => {
            item.action?.onClick()
            toast.dismiss(item.id)
          }}
        >
          {item.action.label}
        </Button>
      {/if}
      <IconButton
        label="Dismiss notification"
        variant="ghost"
        class="size-8"
        onclick={() => toast.dismiss(item.id)}
      >
        <X class="size-4" aria-hidden="true" />
      </IconButton>
    </div>
  {/each}
</div>
