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
    class="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border/70 bg-card/95 px-3 py-2 text-card-foreground shadow-lg backdrop-blur"
  >
    {#if canUndo || canRedo}
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
          onclick={onUndo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        >
          <Undo2 class="size-4" />
        </button>
        <button
          type="button"
          class="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
          onclick={onRedo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 class="size-4" />
        </button>
      </div>
    {/if}

    {#if selectedCount > 0}
      {#if canUndo || canRedo}
        <div class="h-6 w-px bg-border"></div>
      {/if}
      <button
        type="button"
        class="flex items-center gap-2 rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        onclick={onDelete}
        title={`Delete ${selectedCount} element${selectedCount > 1 ? 's' : ''}`}
      >
        <Trash2 class="size-4" />
        <span class="text-sm">{selectedCount}</span>
      </button>
    {/if}
  </div>
{/if}
