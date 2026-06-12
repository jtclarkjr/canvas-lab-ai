<script lang="ts">
  import { ArrowUp, Globe } from 'lucide-svelte'
  import type { SceneDocument } from '$lib/scenes/schema'
  import ContextPicker from '$lib/components/canvas/scenes/document/ContextPicker.svelte'
  import ModelPicker from '$lib/components/canvas/scenes/document/ModelPicker.svelte'

  let {
    disabled = false,
    isStreaming = false,
    // Centered card (blank state) instead of docked to the bottom edge.
    floating = false,
    modelId,
    onModelChange,
    webSearch,
    onWebSearchToggle,
    savedDocuments,
    contextDocumentIds,
    onToggleContext,
    onSend
  } = $props<{
    disabled?: boolean
    isStreaming?: boolean
    floating?: boolean
    modelId: string
    onModelChange: (modelId: string) => void
    webSearch: boolean
    onWebSearchToggle: () => void
    savedDocuments: SceneDocument[]
    contextDocumentIds: string[]
    onToggleContext: (documentId: string) => void
    onSend: (text: string) => void
  }>()

  // Docked composers sit at the bottom edge, so popovers must open upward.
  const popoverSide = $derived(floating ? 'bottom' : 'top')

  let prompt = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)

  const canSend = $derived(!disabled && !isStreaming && prompt.trim().length > 0)

  function autogrow() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 200)}px`
  }

  function send() {
    if (!canSend) return
    onSend(prompt.trim())
    prompt = ''
    if (textareaEl) {
      textareaEl.style.height = 'auto'
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }
</script>

<div class={floating ? 'w-full' : 'border-t border-border/50 px-5 py-3'}>
  <div class="document-composer-shell surface-card flex flex-col gap-2 rounded-2xl p-3">
    <textarea
      bind:this={textareaEl}
      bind:value={prompt}
      oninput={autogrow}
      onkeydown={handleKeydown}
      rows="1"
      placeholder={disabled
        ? 'You have view-only access to this scene'
        : 'Ask for changes, or describe a new document…'}
      class="document-composer-input max-h-52 w-full resize-none bg-transparent text-sm outline-none"
      {disabled}
    ></textarea>

    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-1.5">
        <ModelPicker
          {modelId}
          {onModelChange}
          disabled={disabled || isStreaming}
          side={popoverSide}
        />
        <button
          type="button"
          class={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition disabled:opacity-50 ${
            webSearch
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border/60 bg-background/70 text-muted-foreground hover:text-foreground'
          }`}
          onclick={onWebSearchToggle}
          disabled={disabled || isStreaming}
          title="Search the web while answering"
          aria-pressed={webSearch}
        >
          <Globe class="size-3.5" />
          Search
        </button>
        <ContextPicker
          {savedDocuments}
          selectedIds={contextDocumentIds}
          onToggle={onToggleContext}
          disabled={disabled || isStreaming}
          side={popoverSide}
        />
      </div>

      <button
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
        onclick={send}
        disabled={!canSend}
        title="Send"
      >
        <ArrowUp class="size-4" />
      </button>
    </div>
  </div>
</div>

<style>
  .document-composer-shell {
    --document-composer-foreground: var(--foreground);
    --document-composer-placeholder: var(--muted-foreground);
  }

  :global(.dark) .document-composer-shell {
    --document-composer-foreground: #f8fafc;
    --document-composer-placeholder: #a8b3c2;

    background: #1f2937;
    border-color: rgb(148 163 184 / 0.28);
  }

  .document-composer-input {
    color: var(--document-composer-foreground);
  }

  .document-composer-input::placeholder {
    color: var(--document-composer-placeholder);
  }
</style>
