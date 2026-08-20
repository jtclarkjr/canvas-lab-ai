<script lang="ts">
  import { BookOpen, Check } from 'lucide-svelte'
  import { Popover } from '$lib/components/ui'
  import type { SceneDocumentListItem } from '$lib/scenes/schema'

  let {
    savedDocuments,
    selectedIds,
    onToggle,
    disabled = false,
    side = 'bottom'
  } = $props<{
    savedDocuments: SceneDocumentListItem[]
    selectedIds: string[]
    onToggle: (documentId: string) => void
    disabled?: boolean
    side?: 'top' | 'bottom'
  }>()

  let open = $state(false)
</script>

{#if savedDocuments.length > 0}
  <Popover
    bind:open
    id="scene-context-picker"
    label="Add context"
    role="menu"
    align="start"
    {side}
  >
    {#snippet trigger({ id: popoverId, expanded, props })}
      <button
        {...props}
        type="button"
        class={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition disabled:opacity-50 ${
          selectedIds.length > 0
            ? 'border-primary/60 bg-primary/10 font-semibold text-foreground'
            : 'border-border/60 bg-background/70 text-muted-foreground hover:text-foreground'
        }`}
        aria-expanded={expanded}
        aria-haspopup="menu"
        aria-controls={popoverId}
        aria-label={selectedIds.length > 0
          ? `Context: ${selectedIds.length} document${selectedIds.length !== 1 ? 's' : ''} selected`
          : 'Add context documents'}
        {disabled}
      >
        <BookOpen class="size-3.5" aria-hidden="true" />
        {selectedIds.length > 0
          ? `Context (${selectedIds.length})`
          : 'Add context'}
      </button>
    {/snippet}

    <div class="flex min-w-[220px] flex-col gap-0.5">
      <p class="px-2 py-1 text-xs text-muted-foreground">
        Saved documents the AI may read if useful
      </p>
      {#each savedDocuments as document (document.id)}
        {@const selected = selectedIds.includes(document.id)}
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={selected}
          class={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
            selected
              ? 'bg-primary/10 font-semibold text-foreground'
              : 'hover:bg-muted'
          }`}
          onclick={() => onToggle(document.id)}
        >
          <span class="truncate">{document.title || 'Untitled'}</span>
          {#if selected}
            <Check class="size-3.5 shrink-0" aria-hidden="true" />
          {/if}
        </button>
      {/each}
    </div>
  </Popover>
{/if}
