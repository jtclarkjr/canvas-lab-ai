<script lang="ts">
  import { BookMarked, FilePen, Plus, Trash2 } from 'lucide-svelte'
  import type { SceneDocument } from '$lib/scenes/schema'

  let { documents, activeDocumentId, canModify, onSelect, onNewDraft, onPromote, onDelete } =
    $props<{
      documents: SceneDocument[]
      activeDocumentId: string | null
      canModify: boolean
      onSelect: (documentId: string) => void
      onNewDraft: () => void
      onPromote: (documentId: string) => void
      onDelete: (documentId: string) => void
    }>()

  const drafts = $derived(documents.filter((doc: SceneDocument) => doc.status === 'draft'))
  const saved = $derived(documents.filter((doc: SceneDocument) => doc.status === 'saved'))
</script>

{#snippet documentRow(document: SceneDocument)}
  <div
    class={`group flex items-center gap-1 rounded-lg border px-2 py-1.5 transition ${
      document.id === activeDocumentId
        ? 'border-primary/50 bg-primary/5'
        : 'border-transparent hover:border-border/60'
    }`}
  >
    <button type="button" class="min-w-0 flex-1 text-left" onclick={() => onSelect(document.id)}>
      <span class="block truncate text-sm text-foreground">
        {document.title || 'Untitled'}
      </span>
      <span class="block text-xs text-muted-foreground">
        {new Date(document.updatedAt).toLocaleString()}
      </span>
    </button>

    {#if canModify}
      {#if document.status === 'draft'}
        <button
          type="button"
          class="hidden size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary group-hover:flex"
          onclick={() => onPromote(document.id)}
          title="Save to library"
        >
          <BookMarked class="size-3.5" />
        </button>
      {/if}
      <button
        type="button"
        class="hidden size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500 group-hover:flex"
        onclick={() => onDelete(document.id)}
        title="Delete document"
      >
        <Trash2 class="size-3.5" />
      </button>
    {/if}
  </div>
{/snippet}

<div class="flex h-full flex-col gap-4 overflow-y-auto p-4">
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h3
        class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <FilePen class="size-3.5" />
        Drafts
      </h3>
      {#if canModify}
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onclick={onNewDraft}
          title="New draft"
        >
          <Plus class="size-3.5" />
        </button>
      {/if}
    </div>
    <div class="flex flex-col gap-1">
      {#each drafts as document (document.id)}
        {@render documentRow(document)}
      {:else}
        <p class="px-2 text-xs italic text-muted-foreground">No drafts yet</p>
      {/each}
    </div>
  </div>

  <div>
    <h3
      class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      <BookMarked class="size-3.5" />
      Saved
    </h3>
    <div class="flex flex-col gap-1">
      {#each saved as document (document.id)}
        {@render documentRow(document)}
      {:else}
        <p class="px-2 text-xs italic text-muted-foreground">
          Save a draft to reuse it as context later
        </p>
      {/each}
    </div>
  </div>
</div>
