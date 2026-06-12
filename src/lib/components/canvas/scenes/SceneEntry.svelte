<script lang="ts">
  import { ArrowUp } from 'lucide-svelte'
  import { documentCategories } from '$lib/scenes/document-categories'
  import { defaultModelId } from '$lib/scenes/models'
  import { sceneTypes } from '$lib/scenes/registry'
  import type { SceneTypeId } from '$lib/scenes/types'
  import ModelPicker from '$lib/components/canvas/scenes/document/ModelPicker.svelte'
  import PresetPicker from '$lib/components/canvas/scenes/document/PresetPicker.svelte'

  export type SceneEntryStart = {
    type: SceneTypeId
    category: string
    modelId: string
    prompt: string
  }

  let { readOnly = false, onStart } = $props<{
    readOnly?: boolean
    onStart: (start: SceneEntryStart) => void
  }>()

  let selectedType = $state<SceneTypeId>('document')
  let categoryId = $state(documentCategories[0]?.id ?? 'doc-md')
  let modelId = $state(defaultModelId)
  let prompt = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)

  const canSubmit = $derived(!readOnly && prompt.trim().length > 0)

  function autogrow() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 240)}px`
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

<div class="flex h-full flex-col items-center justify-center gap-6 p-8">
  <div class="text-center">
    <h2 class="text-lg font-semibold text-foreground">What do you want to make?</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Describe the document you want to draft — or start from a preset.
    </p>
  </div>

  {#if sceneTypes.length > 1}
    <div class="flex items-center gap-2">
      {#each sceneTypes as entry (entry.id)}
        <button
          type="button"
          class={`rounded-xl border px-4 py-2 text-sm transition disabled:opacity-50 ${
            selectedType === entry.id
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border/60 text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (selectedType = entry.id)}
          title={entry.description}
          disabled={readOnly}
        >
          {entry.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class="w-full max-w-xl">
    <div class="surface-card flex flex-col gap-3 rounded-2xl p-4">
      <textarea
        bind:this={textareaEl}
        bind:value={prompt}
        oninput={autogrow}
        onkeydown={handleKeydown}
        rows="3"
        placeholder="Describe the document you want to draft…"
        class="max-h-60 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        disabled={readOnly}
      ></textarea>

      <div class="flex items-end justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-2">
          <PresetPicker
            {categoryId}
            onCategoryChange={(next) => (categoryId = next)}
            onPresetPick={(presetPrompt) => {
              prompt = presetPrompt
              autogrow()
            }}
            disabled={readOnly}
          />
          <ModelPicker {modelId} onModelChange={(next) => (modelId = next)} disabled={readOnly} />
        </div>

        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition disabled:opacity-40"
          onclick={submit}
          disabled={!canSubmit}
          title="Start"
        >
          <ArrowUp class="size-4" />
        </button>
      </div>
    </div>
  </div>

  {#if readOnly}
    <p class="text-xs text-muted-foreground">You have view-only access to this canvas.</p>
  {/if}
</div>
