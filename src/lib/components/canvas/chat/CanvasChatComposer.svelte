<script lang="ts">
  import { ArrowUp, Globe } from 'lucide-svelte'

  let {
    disabled = false,
    isStreaming = false,
    placeholder = 'Message…',
    webSearch,
    onWebSearchToggle,
    onSend
  } = $props<{
    disabled?: boolean
    isStreaming?: boolean
    placeholder?: string
    // Optional web-search pill (the Assistant tab uses it; the chatroom
    // composer leaves it off).
    webSearch?: boolean
    onWebSearchToggle?: () => void
    onSend: (text: string) => void
  }>()

  let text = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)

  const canSend = $derived(!disabled && !isStreaming && text.trim().length > 0)

  function autogrow() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 120)}px`
  }

  function send() {
    if (!canSend) return
    onSend(text.trim())
    text = ''
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

<div class="border-t border-border/50 px-3 py-2.5">
  <div class="flex items-end gap-2">
    {#if onWebSearchToggle}
      <button
        type="button"
        class={`flex h-9 shrink-0 items-center justify-center rounded-full border px-2.5 transition disabled:opacity-50 ${
          webSearch
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-border/60 bg-background/70 text-muted-foreground hover:text-foreground'
        }`}
        onclick={onWebSearchToggle}
        disabled={disabled || isStreaming}
        title="Search the web while answering"
        aria-pressed={webSearch}
      >
        <Globe class="size-4" />
      </button>
    {/if}

    <textarea
      bind:this={textareaEl}
      bind:value={text}
      oninput={autogrow}
      onkeydown={handleKeydown}
      rows="1"
      maxlength="4000"
      {placeholder}
      class="max-h-30 min-h-9 w-full resize-none rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
      {disabled}
    ></textarea>

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
