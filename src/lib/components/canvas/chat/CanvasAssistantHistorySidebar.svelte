<script lang="ts">
  import { tick } from 'svelte'
  import { MessageSquare, Pencil, Plus, Trash2 } from 'lucide-svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import type { AssistantThreadEntry } from '$lib/stores/chat/canvas-assistant.svelte'

  const store = useCanvasChatStore()

  let deleteDialogOpen = $state(false)
  let pendingDeleteThread = $state<AssistantThreadEntry | null>(null)
  let editingThreadId = $state<string | null>(null)
  let editingTitle = $state('')
  let editInputEl = $state<HTMLInputElement | null>(null)
  const busy = $derived(store.isAssistantStreaming)

  async function startRenameThread(thread: AssistantThreadEntry) {
    if (busy) return
    editingThreadId = thread.id
    editingTitle = thread.title
    await tick()
    editInputEl?.focus()
    editInputEl?.select()
  }

  function cancelRenameThread() {
    editingThreadId = null
    editingTitle = ''
  }

  async function commitRenameThread(thread: AssistantThreadEntry) {
    if (editingThreadId !== thread.id) return
    const nextTitle = editingTitle.trim()
    cancelRenameThread()
    if (!nextTitle || nextTitle === thread.title) return
    await store.renameAssistantThread(thread.id, nextTitle)
  }

  function handleRenameKeydown(
    event: KeyboardEvent,
    thread: AssistantThreadEntry
  ) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      void commitRenameThread(thread)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelRenameThread()
    }
  }

  function requestDeleteThread(thread: AssistantThreadEntry) {
    if (busy) return
    pendingDeleteThread = thread
    deleteDialogOpen = true
  }

  async function confirmDeleteThread() {
    const thread = pendingDeleteThread
    pendingDeleteThread = null
    if (!thread) return
    await store.deleteAssistantThread(thread.id)
  }
</script>

<aside
  class="flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-border/60 bg-background/88"
>
  <div
    class="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5"
  >
    <div class="min-w-0">
      <p class="m-0 text-sm font-semibold text-foreground">Assistant</p>
      <p class="m-0 truncate text-xs text-muted-foreground">Canvas histories</p>
    </div>
    <button
      type="button"
      class="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
      onclick={() => store.newAssistantThread()}
      disabled={busy}
      aria-label="New assistant chat"
      title="New assistant chat"
    >
      <Plus class="size-4" aria-hidden="true" />
    </button>
  </div>

  {#if store.assistantThreadsLoadError}
    <div class="px-3 py-3 text-xs text-destructive" role="alert">
      {store.assistantThreadsLoadError}
    </div>
  {/if}

  <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
    {#if store.isLoadingAssistantThreads && store.assistantThreads.length === 0}
      <div class="space-y-2 px-1 py-1" aria-hidden="true">
        <div class="h-9 animate-pulse rounded-lg bg-muted/70"></div>
        <div class="h-9 animate-pulse rounded-lg bg-muted/50"></div>
        <div class="h-9 animate-pulse rounded-lg bg-muted/70"></div>
      </div>
    {:else}
      <div class="flex flex-col gap-1" role="list">
        {#each store.assistantThreads as thread (thread.id)}
          {@const active = thread.id === store.assistantActiveThreadId}
          <div
            class={`group flex min-w-0 items-center gap-1 rounded-lg transition ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            }`}
            role="listitem"
          >
            {#if editingThreadId === thread.id}
              <div class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                <MessageSquare class="size-3.5 shrink-0" aria-hidden="true" />
                <input
                  bind:this={editInputEl}
                  bind:value={editingTitle}
                  class="min-w-0 flex-1 rounded-md border border-primary/40 bg-background/90 px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  maxlength="80"
                  aria-label="Rename assistant chat"
                  onblur={() => void commitRenameThread(thread)}
                  onkeydown={(event) => handleRenameKeydown(event, thread)}
                />
              </div>
            {:else}
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm disabled:cursor-default"
                onclick={() => store.selectAssistantThread(thread.id)}
                disabled={busy || active}
                aria-current={active ? 'page' : undefined}
                title={thread.title}
              >
                <MessageSquare class="size-3.5 shrink-0" aria-hidden="true" />
                <span class="truncate">{thread.title}</span>
              </button>
              <button
                type="button"
                class="flex size-7 shrink-0 items-center justify-center rounded-md opacity-70 transition hover:bg-background/80 hover:opacity-100 disabled:opacity-30"
                onclick={() => startRenameThread(thread)}
                disabled={busy}
                aria-label={`Rename ${thread.title}`}
                title="Rename chat"
              >
                <Pencil class="size-3.5" aria-hidden="true" />
              </button>
            {/if}
            <button
              type="button"
              class="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md opacity-70 transition hover:bg-destructive/10 hover:text-destructive hover:opacity-100 disabled:opacity-30"
              onclick={() => requestDeleteThread(thread)}
              disabled={busy}
              aria-label={`Delete ${thread.title}`}
              title="Delete chat"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</aside>

<ConfirmDialog
  bind:open={deleteDialogOpen}
  title="Delete chat?"
  message={`This will permanently delete "${pendingDeleteThread?.title ?? 'this chat'}" and all of its assistant messages.`}
  confirmLabel="Delete chat"
  onConfirm={() => void confirmDeleteThread()}
/>
