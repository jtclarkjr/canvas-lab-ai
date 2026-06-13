<script lang="ts">
  import { ArrowUp, Globe } from 'lucide-svelte'

  type MentionMember = { id: string; name: string; color: string }

  let {
    disabled = false,
    isStreaming = false,
    placeholder = 'Message…',
    webSearch,
    onWebSearchToggle,
    onSend,
    mentionMembers = []
  } = $props<{
    disabled?: boolean
    isStreaming?: boolean
    placeholder?: string
    // Optional web-search pill (the Assistant tab uses it; the chatroom
    // composer leaves it off).
    webSearch?: boolean
    onWebSearchToggle?: () => void
    onSend: (text: string) => void
    mentionMembers?: MentionMember[]
  }>()

  let text = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)

  // ── @mention ──────────────────────────────────────────────────────────────
  // atIndex: position of the '@' that opened the picker; null = picker closed.
  let atIndex = $state<number | null>(null)
  let query = $state('')
  let cursor = $state(0)

  const matches = $derived<MentionMember[]>(
    atIndex === null || mentionMembers.length === 0
      ? []
      : mentionMembers
          .filter((m: MentionMember) =>
            m.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
  )

  // Reset highlight cursor whenever the filtered list changes.
  $effect(() => {
    void matches.length
    cursor = 0
  })

  function detectMention() {
    if (!textareaEl) return
    const pos = textareaEl.selectionStart
    const before = text.slice(0, pos)
    // '@' at start-of-string or after whitespace, followed by non-whitespace.
    const m = before.match(/(^|\s)@(\S*)$/)
    if (m) {
      atIndex = before.lastIndexOf('@')
      query = m[2]
    } else {
      atIndex = null
      query = ''
    }
  }

  function pick(member: MentionMember) {
    if (atIndex === null || !textareaEl) return
    const pos = textareaEl.selectionStart
    const before = text.slice(0, atIndex)
    const after = text.slice(pos)
    const inserted = `@${member.name} `
    text = `${before}${inserted}${after}`
    atIndex = null
    query = ''
    requestAnimationFrame(() => {
      if (!textareaEl) return
      const newPos = before.length + inserted.length
      textareaEl.setSelectionRange(newPos, newPos)
      textareaEl.focus()
      autogrow()
    })
  }

  // ── core ──────────────────────────────────────────────────────────────────

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
    atIndex = null
    if (textareaEl) textareaEl.style.height = 'auto'
  }

  function handleKeydown(e: KeyboardEvent) {
    if (atIndex !== null && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        cursor = (cursor + 1) % matches.length
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        cursor = (cursor - 1 + matches.length) % matches.length
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pick(matches[cursor])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        atIndex = null
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function handleInput() {
    autogrow()
    if (mentionMembers.length > 0) detectMention()
  }
</script>

<div class="relative border-t border-border/50 px-3 py-2.5">
  {#if atIndex !== null && matches.length > 0}
    <div
      class="absolute right-3 bottom-full left-3 z-10 mb-1 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg"
    >
      {#each matches as member, i (member.id)}
        <button
          type="button"
          class={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
            i === cursor
              ? 'bg-primary/10 text-foreground'
              : 'text-foreground hover:bg-muted/60'
          }`}
          onmousedown={(e) => {
            e.preventDefault()
            pick(member)
          }}
        >
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={`background-color:${member.color}`}
          >
            {member.name[0]?.toUpperCase() ?? '?'}
          </span>
          <span class="truncate">{member.name}</span>
        </button>
      {/each}
    </div>
  {/if}

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
      oninput={handleInput}
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
