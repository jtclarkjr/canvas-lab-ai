<script lang="ts">
  import { tick } from 'svelte'
  import { Pencil } from 'lucide-svelte'
  import { IconButton, Input } from '$lib/components/ui'

  let {
    title,
    canModify,
    className = '',
    inputClassName = '',
    buttonClassName = '',
    onSave
  } = $props<{
    title: string
    canModify: boolean
    className?: string
    inputClassName?: string
    buttonClassName?: string
    onSave: (title: string) => void | Promise<void>
  }>()

  let editing = $state(false)
  let draft = $state('')
  let inputEl = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (!editing) {
      draft = title
    }
  })

  function stopEvent(event: Event) {
    event.stopPropagation()
  }

  async function startEditing(event: MouseEvent) {
    event.stopPropagation()
    draft = title
    editing = true
    await tick()
    inputEl?.focus()
    inputEl?.select()
  }

  function cancelEditing() {
    draft = title
    editing = false
  }

  async function commitTitle() {
    const nextTitle = draft.trim()
    editing = false
    if (!nextTitle || nextTitle === title) {
      draft = title
      return
    }
    await onSave(nextTitle)
  }

  function handleKeydown(event: KeyboardEvent) {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      void commitTitle()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
    }
  }
</script>

{#if editing}
  <Input
    bind:ref={inputEl}
    bind:value={draft}
    maxlength={120}
    class={`h-8 min-w-0 flex-1 rounded px-2 py-1 text-sm font-semibold ${inputClassName}`}
    aria-label="Workflow title"
    onblur={() => void commitTitle()}
    onclick={stopEvent}
    onpointerdown={stopEvent}
    onkeydown={handleKeydown}
  />
{:else}
  <span
    class={`min-w-0 flex-1 truncate text-sm font-semibold text-foreground ${className}`}
  >
    {title}
  </span>
  {#if canModify}
    <IconButton
      type="button"
      variant="ghost"
      label="Rename workflow"
      class={`flex size-7 shrink-0 opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 ${buttonClassName}`}
      onclick={startEditing}
      onpointerdown={stopEvent}
    >
      <Pencil class="size-3.5" aria-hidden="true" />
    </IconButton>
  {/if}
{/if}
