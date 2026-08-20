<script lang="ts">
  import { colorFromId } from '$lib/canvas/helpers/color-from-id'
  import { segmentMentions } from '$lib/chat/mentions'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import type { ChatEntry } from '$lib/stores/chat/canvas-chat/types'
  import MobileCanvasChatComposer from '$lib/mobile/components/chat/MobileCanvasChatComposer.svelte'
  import { VirtualizedMessageList } from '$lib/components/shared/collections'
  import { ChatLoadingSkeleton } from '$lib/components/shared/chat'

  let { userId, alwaysVisible = false } = $props<{
    userId: string
    alwaysVisible?: boolean
  }>()

  const store = useCanvasChatStore()
  const visible = $derived(
    alwaysVisible || (store.open && store.activeTab === 'chat')
  )
  const mentionMembers = $derived(
    store.mentionMembers
      .filter((member) => member.id !== userId)
      .map((member) => ({ ...member, color: colorFromId(member.id) }))
  )
  const myName = $derived(
    store.mentionMembers.find((member) => member.id === userId)?.name ?? null
  )

  const followKey = $derived(store.entries.length)

  function isOwn(entry: ChatEntry) {
    return entry.message.createdBy === userId
  }

  function authorLabel(entry: ChatEntry) {
    if (isOwn(entry)) {
      return { name: 'You', color: null as string | null }
    }

    return {
      name: entry.message.author?.name ?? 'Someone',
      color: entry.message.createdBy
        ? colorFromId(entry.message.createdBy)
        : null
    }
  }

  function timeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })
  }
</script>

<div class="flex h-full min-h-0 flex-col">
  {#if store.isLoadingChat}
    <ChatLoadingSkeleton size="md" class="flex-1" />
  {:else}
    <VirtualizedMessageList
      items={store.entries}
      keyForItem={(entry) => entry.message.id}
      estimateSize={76}
      active={visible}
      followMode="when-at-end"
      {followKey}
      className="px-4 py-3"
    >
      {#snippet before()}
        {#if store.chatLoadError}
          <div
            class="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
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
      {/snippet}

      {#snippet item(entry)}
        {@const own = isOwn(entry)}
        {@const label = authorLabel(entry)}
        {@const segs = segmentMentions(entry.message.content, myName)}
        <div class={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
          <span class="mb-1 px-1 text-[11px] font-medium text-foreground">
            {label.name} · {timeLabel(entry.message.createdAt)}
          </span>
          <div
            class={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              entry.status === 'failed'
                ? 'border border-destructive/50 bg-destructive/10 text-foreground'
                : own
                  ? 'bg-foreground font-medium text-background'
                  : 'border border-border/60 bg-background/80 text-foreground'
            } ${entry.status === 'pending' ? 'opacity-60' : ''}`}
          >
            {#each segs as seg}{#if seg.hi}<mark
                  class={`rounded-md px-1.5 py-0.5 font-semibold not-italic ${
                    own
                      ? 'bg-white/20 text-primary-foreground'
                      : 'bg-warning/25 text-warning-foreground dark:bg-warning/20 dark:text-warning'
                  }`}>{seg.text}</mark
                >{:else}{seg.text}{/if}{/each}
          </div>
          {#if entry.status === 'failed'}
            <div
              class="mt-1 flex items-center gap-2 px-1 text-[11px] text-destructive"
              role="alert"
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
      {/snippet}

      {#snippet empty()}
        {#if !store.chatLoadError}
          <div
            class="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground"
          >
            No messages yet. Say hi to your collaborators.
          </div>
        {/if}
      {/snippet}
    </VirtualizedMessageList>
  {/if}

  <MobileCanvasChatComposer
    disabled={store.isLoadingChat}
    placeholder="Message the canvas..."
    {mentionMembers}
    onSend={(text) => void store.send(text)}
  />
</div>
