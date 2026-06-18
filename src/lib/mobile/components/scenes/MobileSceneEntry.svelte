<script lang="ts">
  import { ArrowUp, FileText, NotebookPen } from 'lucide-svelte'
  import { documentCategories } from '$lib/scenes/document-categories'
  import { defaultModelId } from '$lib/scenes/models'
  import { sceneTypes } from '$lib/scenes/registry'
  import type { SceneTypeId } from '$lib/scenes/types'

  export type MobileSceneEntryStart = {
    type: SceneTypeId
    category: string
    modelId: string
    prompt: string
  }

  let { readOnly = false, onStart } = $props<{
    readOnly?: boolean
    onStart: (start: MobileSceneEntryStart) => void
  }>()

  let selectedType = $state<SceneTypeId>('document')
  let categoryId = $state(documentCategories[0]?.id ?? 'doc-md')
  let modelId = $state(defaultModelId)
  let prompt = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)

  const canSubmit = $derived(!readOnly && prompt.trim().length > 0)
  const typeIcon = (type: string) => (type === 'notes' ? NotebookPen : FileText)

  function autogrow() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 180)}px`
  }

  function submit() {
    if (!canSubmit) return
    onStart({
      type: selectedType,
      category: categoryId,
      modelId,
      prompt: prompt.trim()
    })
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto px-4 py-5">
  <div>
    <h2 class="text-lg font-bold text-foreground">Start a scene</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Draft a document or notes view with mobile controls.
    </p>
  </div>

  {#if sceneTypes.length > 1}
    <div class="grid grid-cols-2 gap-2">
      {#each sceneTypes as entry (entry.id)}
        {@const Icon = typeIcon(entry.id)}
        <button
          type="button"
          class={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition disabled:opacity-50 ${
            selectedType === entry.id
              ? 'border-primary/60 bg-primary text-primary-foreground'
              : 'border-border/70 bg-background text-muted-foreground'
          }`}
          onclick={() => (selectedType = entry.id)}
          disabled={readOnly}
          aria-pressed={selectedType === entry.id}
        >
          <Icon class="size-4" aria-hidden="true" />
          {entry.label}
        </button>
      {/each}
    </div>
  {/if}

  <label class="block">
    <span
      class="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
    >
      Preset
    </span>
    <select
      class="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary"
      bind:value={categoryId}
      disabled={readOnly}
    >
      {#each documentCategories as category (category.id)}
        <option value={category.id}>{category.label}</option>
      {/each}
    </select>
  </label>

  <label class="block">
    <span
      class="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
    >
      Prompt
    </span>
    <textarea
      bind:this={textareaEl}
      bind:value={prompt}
      oninput={autogrow}
      onkeydown={handleKeydown}
      rows="5"
      placeholder="Describe what this scene should contain..."
      class="min-h-36 w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-base outline-none focus:border-primary"
      disabled={readOnly}
    ></textarea>
  </label>

  <button
    type="button"
    class="mt-auto flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-40"
    onclick={submit}
    disabled={!canSubmit}
  >
    <ArrowUp class="size-4" aria-hidden="true" />
    Start
  </button>

  {#if readOnly}
    <p class="text-center text-xs text-muted-foreground">
      You have view-only access to this canvas.
    </p>
  {/if}
</div>
