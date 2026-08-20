<script lang="ts">
  import { tick } from 'svelte'
  import { ArrowUp, Globe } from 'lucide-svelte'
  import { IconButton, Textarea } from '$lib/components/ui'
  import { cn } from '$lib/utils'
  import type { ChatComposerProps, MentionMember } from './types'

  let {
    density = 'compact',
    disabled = false,
    isStreaming = false,
    placeholder = 'Message…',
    className = '',
    webSearch,
    onWebSearchToggle,
    onSend,
    mentionMembers = []
  }: ChatComposerProps = $props()

  let text = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)
  let atIndex = $state<number | null>(null)
  let query = $state('')
  let cursor = $state(0)

  const touch = $derived(density === 'touch')
  const matches = $derived<MentionMember[]>(
    atIndex === null || mentionMembers.length === 0
      ? []
      : mentionMembers
          .filter((member) =>
            member.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
  )
  const canSend = $derived(!disabled && !isStreaming && text.trim().length > 0)

  $effect(() => {
    void matches.length
    cursor = 0
  })

  function autogrow() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, touch ? 128 : 120)}px`
  }

  function detectMention() {
    if (!textareaEl) return
    const position = textareaEl.selectionStart
    const before = text.slice(0, position)
    const match = before.match(/(^|\s)@(\S*)$/)
    if (match) {
      atIndex = before.lastIndexOf('@')
      query = match[2]
      return
    }
    atIndex = null
    query = ''
  }

  async function pick(member: MentionMember) {
    if (atIndex === null || !textareaEl) return
    const position = textareaEl.selectionStart
    const before = text.slice(0, atIndex)
    const after = text.slice(position)
    const inserted = `@${member.name} `
    text = `${before}${inserted}${after}`
    atIndex = null
    query = ''
    await tick()
    if (!textareaEl) return
    const nextPosition = before.length + inserted.length
    textareaEl.setSelectionRange(nextPosition, nextPosition)
    textareaEl.focus()
    autogrow()
  }

  function send() {
    if (!canSend) return
    onSend(text.trim())
    text = ''
    atIndex = null
    query = ''
    if (textareaEl) textareaEl.style.height = 'auto'
  }

  function handleKeydown(event: KeyboardEvent) {
    if (atIndex !== null && matches.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        cursor = (cursor + 1) % matches.length
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        cursor = (cursor - 1 + matches.length) % matches.length
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        void pick(matches[cursor])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        atIndex = null
        return
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  function handleInput() {
    autogrow()
    if (mentionMembers.length > 0) detectMention()
  }
</script>

<div
  class={cn(
    'relative border-t border-border/50 px-3',
    touch ? 'pt-2.5' : 'py-2.5',
    className
  )}
  style={touch
    ? 'padding-bottom:max(0.75rem, env(safe-area-inset-bottom));'
    : undefined}
>
  {#if atIndex !== null && matches.length > 0}
    <div
      class={cn(
        'absolute right-3 bottom-full left-3 z-10 overflow-hidden border border-border/60 bg-popover shadow-lg',
        touch ? 'mb-2 rounded-2xl' : 'mb-1 rounded-xl'
      )}
    >
      {#each matches as member, index (member.id)}
        <button
          type="button"
          class={cn(
            'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition',
            touch && 'min-h-11 active:bg-muted/70',
            index === cursor ? 'bg-primary/10' : !touch && 'hover:bg-muted/60'
          )}
          onmousedown={(event) => {
            event.preventDefault()
            void pick(member)
          }}
        >
          <span
            class={cn(
              'flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
              touch ? 'size-7' : 'size-6'
            )}
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
      <IconButton
        label="Search the web while answering"
        variant="outline"
        class={cn(
          'shrink-0 border transition disabled:opacity-50',
          touch ? 'size-11' : 'size-9',
          webSearch
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-border/60 bg-background/70 text-muted-foreground',
          !webSearch && (touch ? 'active:bg-muted/70' : 'hover:text-foreground')
        )}
        onclick={onWebSearchToggle}
        disabled={disabled || isStreaming}
        aria-pressed={webSearch}
      >
        <Globe class="size-4" aria-hidden="true" />
      </IconButton>
    {/if}

    <Textarea
      bind:ref={textareaEl}
      bind:value={text}
      oninput={handleInput}
      onkeydown={handleKeydown}
      rows={1}
      maxlength={4000}
      {placeholder}
      aria-label={placeholder}
      class={cn(
        'w-full resize-none border border-border/60 bg-background/80 text-foreground outline-none placeholder:text-muted-foreground',
        touch
          ? 'max-h-32 min-h-11 rounded-[1.35rem] px-3.5 py-2.5 text-base focus:border-primary/50'
          : 'max-h-30 min-h-9 rounded-2xl px-3 py-2 text-sm focus:border-primary/40'
      )}
      {disabled}
    />

    <IconButton
      label="Send message"
      class={cn(
        'shrink-0 bg-primary text-primary-foreground transition disabled:opacity-40',
        touch ? 'size-11' : 'size-9'
      )}
      onclick={send}
      disabled={!canSend}
    >
      <ArrowUp class={touch ? 'size-5' : 'size-4'} aria-hidden="true" />
    </IconButton>
  </div>
</div>
