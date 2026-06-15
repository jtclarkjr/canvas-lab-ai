<script lang="ts">
  import { Check, ClipboardList } from 'lucide-svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import type { Scene, SceneDocumentListItem } from '$lib/scenes/schema'

  let {
    scenes,
    savedDocuments,
    includeLinkedScenes,
    selectedSceneIds,
    selectedDocumentIds,
    disabled = false,
    side = 'top',
    compact = false,
    onIncludeLinkedScenesChange,
    onToggleScene,
    onToggleDocument
  } = $props<{
    scenes: Scene[]
    savedDocuments: SceneDocumentListItem[]
    includeLinkedScenes: boolean
    selectedSceneIds: string[]
    selectedDocumentIds: string[]
    disabled?: boolean
    side?: 'top' | 'bottom'
    compact?: boolean
    onIncludeLinkedScenesChange: (checked: boolean) => void
    onToggleScene: (sceneId: string) => void
    onToggleDocument: (documentId: string) => void
  }>()

  let open = $state(false)

  const selectedCount = $derived(
    selectedSceneIds.length +
      selectedDocumentIds.length +
      (includeLinkedScenes ? 1 : 0)
  )
</script>

<Popover
  bind:open
  id="workflow-context-picker"
  label="Workflow AI context"
  align="start"
  {side}
>
  {#snippet trigger({ id: popoverId, expanded })}
    <button
      type="button"
      class={`flex items-center rounded-full border transition disabled:opacity-50 ${
        compact
          ? 'h-7 max-w-[108px] gap-1 px-2 text-[11px]'
          : 'h-8 gap-1.5 px-3 text-xs'
      } ${
        selectedCount > 0
          ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border/60 bg-background/70 text-muted-foreground hover:text-foreground'
      }`}
      onclick={() => (open = !open)}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-controls={popoverId}
      aria-label={selectedCount > 0
        ? `Workflow context: ${selectedCount} selected`
        : 'Workflow context'}
      {disabled}
    >
      <ClipboardList class="size-3.5 shrink-0" aria-hidden="true" />
      <span class="min-w-0 truncate">
        {selectedCount > 0 ? `Context (${selectedCount})` : 'Context'}
      </span>
    </button>
  {/snippet}

  <div class="grid max-h-[22rem] min-w-[260px] gap-3 overflow-auto p-1">
    <label class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
      <input
        type="checkbox"
        checked={includeLinkedScenes}
        {disabled}
        onchange={(event) =>
          onIncludeLinkedScenesChange(event.currentTarget.checked)}
      />
      Include linked scenes
    </label>

    <section class="grid gap-1">
      <p class="px-2 text-xs font-semibold text-muted-foreground">Scenes</p>
      {#each scenes as scene (scene.id)}
        {@const selected = selectedSceneIds.includes(scene.id)}
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          class={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
            selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          }`}
          onclick={() => onToggleScene(scene.id)}
          {disabled}
        >
          <span class="truncate">{scene.title || 'Scene'}</span>
          {#if selected}
            <Check class="size-3.5 shrink-0" aria-hidden="true" />
          {/if}
        </button>
      {:else}
        <p class="px-2 text-xs text-muted-foreground">No scenes available.</p>
      {/each}
    </section>

    <section class="grid gap-1">
      <p class="px-2 text-xs font-semibold text-muted-foreground">Documents</p>
      {#each savedDocuments as document (document.id)}
        {@const selected = selectedDocumentIds.includes(document.id)}
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          class={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
            selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          }`}
          onclick={() => onToggleDocument(document.id)}
          {disabled}
        >
          <span class="truncate">{document.title || 'Untitled'}</span>
          {#if selected}
            <Check class="size-3.5 shrink-0" aria-hidden="true" />
          {/if}
        </button>
      {:else}
        <p class="px-2 text-xs text-muted-foreground">No saved documents.</p>
      {/each}
    </section>
  </div>
</Popover>
