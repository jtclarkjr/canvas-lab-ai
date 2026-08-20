<script lang="ts">
  import { MessageSquare, Mic, MicOff, Pin, Users } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import ConferenceCallChatPanel from '$lib/components/canvas/conference/ConferenceCallChatPanel.svelte'
  import MobileCanvasChatRoomPanel from '$lib/mobile/components/chat/MobileCanvasChatRoomPanel.svelte'
  import { BottomSheet, SegmentedControl } from '$lib/components/ui'
  import { Avatar } from '$lib/components/shared/identity'

  const store = useCanvasConferenceStore()
  const chatStore = useCanvasChatStore()

  const title = $derived(
    store.fullscreenPanel === 'chat'
      ? 'Chat'
      : `People · ${store.participants.length}`
  )
  const conferenceChatTabs = [
    { value: 'call', label: 'Call' },
    { value: 'canvas', label: 'Canvas' }
  ]

  function closePanel() {
    if (store.fullscreenPanel === 'chat') {
      store.toggleFullscreenPanel('chat')
    } else if (store.fullscreenPanel === 'people') {
      store.toggleFullscreenPanel('people')
    }
  }
</script>

<BottomSheet
  open
  onOpenChange={(nextOpen) => {
    if (!nextOpen) closePanel()
  }}
  {title}
  layerClass="z-[60]"
  handleLabel="Drag down to close call panel"
>
  {#snippet header()}
    <div class="border-b border-border/60 px-4 pb-3">
      <div class="flex items-center gap-3">
        <h2 class="flex min-w-0 items-center gap-2 text-sm font-bold">
          {#if store.fullscreenPanel === 'chat'}
            <MessageSquare class="size-4 shrink-0" aria-hidden="true" />
          {:else}
            <Users class="size-4 shrink-0" aria-hidden="true" />
          {/if}
          <span class="truncate">{title}</span>
        </h2>
      </div>

      {#if store.fullscreenPanel === 'chat'}
        <SegmentedControl
          value={store.fullscreenChatTab}
          items={conferenceChatTabs}
          label="Conference chat source"
          class="mt-3"
          onValueChange={(value) => {
            if (value === 'call' || value === 'canvas') {
              store.setFullscreenChatTab(value)
            }
          }}
        >
          {#snippet item(option)}
            <span class="truncate">{option.label}</span>
            {#if option.value === 'call' && store.callChatUnreadCount > 0 && store.fullscreenChatTab !== 'call'}
              <span
                class="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
              >
                {store.callChatUnreadCount > 9
                  ? '9+'
                  : store.callChatUnreadCount}
              </span>
            {:else if option.value === 'canvas' && chatStore.unreadCount > 0 && store.fullscreenChatTab !== 'canvas'}
              <span
                class="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
              >
                {chatStore.unreadCount > 9 ? '9+' : chatStore.unreadCount}
              </span>
            {/if}
          {/snippet}
        </SegmentedControl>
      {/if}
    </div>
  {/snippet}

  {#if store.fullscreenPanel === 'chat'}
    <div class="min-h-0 flex-1">
      {#if store.fullscreenChatTab === 'call'}
        <ConferenceCallChatPanel />
      {:else}
        <MobileCanvasChatRoomPanel userId={store.userId} alwaysVisible />
      {/if}
    </div>
  {:else if store.fullscreenPanel === 'people'}
    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      {#each store.participants as participant (participant.identity)}
        <div class="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar
            name={participant.name}
            fallback={participant.name.trim().slice(0, 2).toUpperCase() || 'ME'}
            color={participant.color}
            class={`size-10 text-xs font-bold text-[var(--canvas-avatar-foreground)] shadow-inner ${participant.isSpeaking ? 'ring-2 ring-success' : ''}`}
          />
          <span class="min-w-0 flex-1 truncate text-sm font-medium">
            {participant.isLocal ? 'You' : participant.name}
          </span>
          <button
            type="button"
            class={`flex size-8 items-center justify-center rounded-full transition ${
              store.pinnedIdentity === participant.identity
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground'
            }`}
            onclick={() => store.pin(participant.identity)}
            aria-label={`${store.pinnedIdentity === participant.identity ? 'Unpin' : 'Pin'} ${participant.isLocal ? 'yourself' : participant.name}`}
            aria-pressed={store.pinnedIdentity === participant.identity}
          >
            <Pin class="size-4" aria-hidden="true" />
          </button>
          <span
            class={participant.micEnabled
              ? 'text-muted-foreground'
              : 'text-destructive'}
            role="img"
            aria-label={participant.micEnabled
              ? 'Microphone on'
              : 'Microphone muted'}
          >
            {#if participant.micEnabled}
              <Mic class="size-4" aria-hidden="true" />
            {:else}
              <MicOff class="size-4" aria-hidden="true" />
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</BottomSheet>
