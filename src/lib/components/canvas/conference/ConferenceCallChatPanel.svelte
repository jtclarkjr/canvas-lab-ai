<script lang="ts">
  import CanvasChatComposer from '$lib/components/canvas/chat/CanvasChatComposer.svelte'
  import { segmentMentions } from '$lib/chat/mentions'
  import type { ConferenceCallChatEntry } from '$lib/conference/types'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import { VirtualizedMessageList } from '$lib/components/shared/collections'

  const store = useCanvasConferenceStore()

  const mentionMembers = $derived(
    store.participants
      .filter((participant) => !participant.isLocal)
      .map((participant) => ({
        id: participant.identity,
        name: participant.name,
        color: participant.color
      }))
  )

  const myName = $derived(
    store.participants.find((participant) => participant.isLocal)?.name ?? null
  )

  const followKey = $derived(store.callChatEntries.length)

  function isOwn(entry: ConferenceCallChatEntry) {
    return entry.message.createdBy === store.userId
  }

  function authorName(entry: ConferenceCallChatEntry) {
    return isOwn(entry) ? 'You' : entry.message.author.name
  }

  function bubbleClass(entry: ConferenceCallChatEntry, own: boolean) {
    if (entry.status === 'failed') {
      return 'border border-destructive/50 bg-destructive/10 text-foreground'
    }
    if (own) {
      return 'bg-primary text-primary-foreground'
    }
    return 'border border-border/60 bg-background/70 text-foreground'
  }

  function timeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })
  }
</script>

<div class="flex h-full min-h-0 flex-col">
  <VirtualizedMessageList
    items={store.callChatEntries}
    keyForItem={(entry) => entry.message.id}
    estimateSize={72}
    followMode="when-at-end"
    {followKey}
    className="px-4 py-3"
  >
    {#snippet item(entry)}
      {@const own = isOwn(entry)}
      {@const segs = segmentMentions(entry.message.content, myName)}
      <div class={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
        <span
          class="mb-0.5 flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground"
        >
          {#if !own}
            <span
              class="size-1.5 shrink-0 rounded-full"
              style={`background-color:${entry.message.author.color}`}
              aria-hidden="true"
            ></span>
          {/if}
          {authorName(entry)} · {timeLabel(entry.message.createdAt)}
        </span>
        <div
          class={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${bubbleClass(entry, own)} ${entry.status === 'pending' ? 'opacity-60' : ''}`}
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
            class="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-destructive"
            role="alert"
          >
            <span>{entry.errorMessage ?? 'Failed to send.'}</span>
            <button
              type="button"
              class="font-medium underline"
              onclick={() => void store.retryCallChatMessage(entry.message.id)}
            >
              Retry
            </button>
            <button
              type="button"
              class="font-medium underline"
              onclick={() => store.dismissCallChatMessage(entry.message.id)}
            >
              Dismiss
            </button>
          </div>
        {/if}
      </div>
    {/snippet}

    {#snippet empty()}
      <div
        class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
      >
        No call messages yet.
      </div>
    {/snippet}
  </VirtualizedMessageList>

  <CanvasChatComposer
    disabled={!store.isInCall}
    placeholder="Message the call…"
    {mentionMembers}
    onSend={(text) => void store.sendCallChatMessage(text)}
  />
</div>
