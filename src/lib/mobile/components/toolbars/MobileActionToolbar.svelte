<script lang="ts">
  import { Redo2, Trash2, Undo2 } from 'lucide-svelte'

  let { selectedCount, canUndo, canRedo, onDelete, onUndo, onRedo } = $props<{
    selectedCount: number
    canUndo: boolean
    canRedo: boolean
    onDelete: () => void
    onUndo: () => void
    onRedo: () => void
  }>()
</script>

{#if canUndo || canRedo || selectedCount > 0}
  <div
    class="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 flex items-center gap-1 rounded-full border border-border/70 bg-card/95 px-1.5 py-1.5 text-card-foreground shadow-lg backdrop-blur"
    data-camera-exempt
  >
    {#if canUndo || canRedo}
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-md p-2 text-muted-foreground transition disabled:opacity-40"
          onclick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          aria-keyshortcuts="Meta+Z"
        >
          <Undo2 class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="rounded-md p-2 text-muted-foreground transition disabled:opacity-40"
          onclick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          aria-keyshortcuts="Meta+Shift+Z"
        >
          <Redo2 class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}

    {#if selectedCount > 0}
      {#if canUndo || canRedo}
        <div class="h-6 w-px bg-border"></div>
      {/if}
      <button
        type="button"
        class="flex items-center gap-2 rounded-md p-2 text-muted-foreground transition"
        onclick={onDelete}
        aria-label={`Delete ${selectedCount} selected element${selectedCount > 1 ? 's' : ''}`}
      >
        <Trash2 class="size-4" aria-hidden="true" />
        <span class="text-sm" aria-hidden="true">{selectedCount}</span>
      </button>
    {/if}
  </div>
{/if}
