<script lang="ts">
  import { documentCategories, getDocumentCategory } from '$lib/scenes/document-categories'

  let {
    categoryId,
    onCategoryChange,
    onPresetPick,
    disabled = false
  } = $props<{
    categoryId: string
    onCategoryChange: (categoryId: string) => void
    onPresetPick: (prompt: string) => void
    disabled?: boolean
  }>()

  const category = $derived(getDocumentCategory(categoryId))
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-wrap items-center gap-1.5">
    {#each documentCategories as entry (entry.id)}
      <button
        type="button"
        class={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
          entry.id === categoryId
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:text-foreground'
        }`}
        onclick={() => onCategoryChange(entry.id)}
        title={entry.description}
        {disabled}
      >
        {entry.label}
      </button>
    {/each}
  </div>

  {#if category}
    <div class="flex flex-wrap items-center gap-1.5">
      {#each category.presets as preset (preset.id)}
        <button
          type="button"
          class="rounded-md border border-dashed border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          onclick={() => onPresetPick(preset.prompt)}
          {disabled}
        >
          {preset.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
