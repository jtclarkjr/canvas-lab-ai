<script lang="ts">
  import { fly } from 'svelte/transition'
  import { toast } from '$lib/stores/toast.svelte'
</script>

{#if toast.items.length > 0}
  <div
    class="pointer-events-none fixed right-4 bottom-6 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:w-full"
  >
    {#each toast.items as item (item.id)}
      <div
        transition:fly={{ y: 16, duration: 200 }}
        class={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
          item.variant === 'error'
            ? 'border-destructive/40 bg-popover text-destructive'
            : 'border-border bg-popover text-popover-foreground'
        }`}
        role="status"
      >
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">{item.title}</p>
          {#if item.description}
            <p class="truncate text-xs text-muted-foreground">{item.description}</p>
          {/if}
        </div>
        {#if item.action}
          <button
            type="button"
            class="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90"
            onclick={() => {
              item.action?.onClick()
              toast.dismiss(item.id)
            }}
          >
            {item.action.label}
          </button>
        {/if}
        <button
          type="button"
          class="shrink-0 text-lg leading-none text-muted-foreground transition hover:text-foreground"
          onclick={() => toast.dismiss(item.id)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}
