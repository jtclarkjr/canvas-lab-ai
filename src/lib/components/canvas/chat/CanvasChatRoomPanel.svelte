<script lang="ts">
  import { colorFromId } from '$lib/canvas/helpers/color-from-id'
  import {
    useCanvasChatStore,
    type ChatEntry
  } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasChatComposer from '$lib/components/canvas/chat/CanvasChatComposer.svelte'
  import { segmentMentions } from '$lib/chat/mentions'

  // alwaysVisible: hosts outside the chat window (the call's fullscreen
  // chat panel) control their own visibility, so the auto-scroll behavior
  // shouldn't wait on the window being open.
  let { userId, alwaysVisible = false } = $props<{
    userId: string
    alwaysVisible?: boolean
  }>()

  const store = useCanvasChatStore()

  const visible = $derived(
    alwaysVisible || (store.open && store.activeTab === 'chat')
  )

  let scrollEl = $state<HTMLDivElement | null>(null)
  let atBottom = true

  function scrollToBottom() {
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight
    }
  }

  function handleScroll() {
    if (!scrollEl) return
    atBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 32
  }

  // Open at the bottom whenever the panel becomes visible (rAF: the panel
  // un-hides in the same tick, so layout has to exist before scrolling).
  $effect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        atBottom = true
        scrollToBottom()
      })
    }
  })

  // Stick to the bottom on new messages, but only when already there —
  // never yank the view away from someone reading history.
  $effect(() => {
    void store.entries.length
    if (visible && atBottom) {
      scrollToBottom()
    }
  })

  function isOwn(entry: ChatEntry) {
    return entry.message.createdBy === userId
  }

  function authorLabel(entry: ChatEntry) {
    if (isOwn(entry)) {
      return { name: 'You', color: null as string | null }
    }
    const author = entry.message.author
    return {
      name: author?.name ?? 'Someone',
      color: entry.message.createdBy
        ? colorFromId(entry.message.createdBy)
        : null
    }
  }

  // Undefined locale = the user's own region settings.
  function timeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const mentionMembers = $derived(
    store.mentionMembers
      .filter((m) => m.id !== userId)
      .map((m) => ({ ...m, color: colorFromId(m.id) }))
  )

  const myName = $derived(
    store.mentionMembers.find((m) => m.id === userId)?.name ?? null
  )
</script>

<div class="flex h-full min-h-0 flex-col">
  {#if store.isLoadingChat}
    <div
      class="flex flex-1 flex-col justify-end gap-3 px-4 py-4"
      aria-hidden="true"
    >
      <div class="h-9 w-3/5 animate-pulse rounded-2xl bg-muted/80"></div>
      <div
        class="ml-auto h-9 w-2/5 animate-pulse rounded-2xl bg-muted/60"
      ></div>
      <div class="h-9 w-4/5 animate-pulse rounded-2xl bg-muted/80"></div>
      <div
        class="ml-auto h-9 w-3/5 animate-pulse rounded-2xl bg-muted/60"
      ></div>
    </div>
  {:else}
    <div
      bind:this={scrollEl}
      onscroll={handleScroll}
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
    >
      {#if store.chatLoadError}
        <div
          class="flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <span>{store.chatLoadError}</span>
          <button
            type="button"
            class="font-medium underline"
            onclick={() => void store.retryChatLoad()}
          >
            Retry
          </button>
        </div>
      {/if}

      {#each store.entries as entry (entry.message.id)}
        {@const own = isOwn(entry)}
        {@const label = authorLabel(entry)}
        {@const segs = segmentMentions(entry.message.content, myName)}
        <div class={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
          <span
            class="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground"
            style={label.color ? `color:${label.color}` : undefined}
          >
            {label.name} · {timeLabel(entry.message.createdAt)}
          </span>
          <div
            class={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              entry.status === 'failed'
                ? 'border border-destructive/50 bg-destructive/10 text-foreground'
                : own
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/60 bg-background/70 text-foreground'
            } ${entry.status === 'pending' ? 'opacity-60' : ''}`}
          >
            {#each segs as seg}{#if seg.hi}<mark
                  class={`rounded-md px-1.5 py-0.5 font-semibold not-italic ${
                    own
                      ? 'bg-white/20 text-primary-foreground'
                      : 'bg-warning/30 text-warning-foreground'
                  }`}>{seg.text}</mark
                >{:else}{seg.text}{/if}{/each}
          </div>
          {#if entry.status === 'failed'}
            <!-- Send failures stay local: the message never reached other
                 members, so the error is only shown to this user. -->
            <div
              class="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-destructive"
            >
              <span>{entry.errorMessage ?? 'Failed to send.'}</span>
              <button
                type="button"
                class="font-medium underline"
                onclick={() => void store.retry(entry.message.id)}
              >
                Retry
              </button>
              <button
                type="button"
                class="font-medium underline"
                onclick={() => store.dismissFailed(entry.message.id)}
              >
                Dismiss
              </button>
            </div>
          {/if}
        </div>
      {/each}

      {#if store.entries.length === 0 && !store.chatLoadError}
        <div
          class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
        >
          No messages yet. Say hi to your collaborators.
        </div>
      {/if}
    </div>
  {/if}

  <CanvasChatComposer
    disabled={store.isLoadingChat}
    placeholder="Message the canvas…"
    {mentionMembers}
    onSend={(text) => void store.send(text)}
  />
</div>
