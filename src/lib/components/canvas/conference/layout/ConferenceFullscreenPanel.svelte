<script lang="ts">
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { Mic, MicOff, Minimize2, Pin } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import CanvasChatRoomPanel from '$lib/components/canvas/chat/CanvasChatRoomPanel.svelte'
  import ConferenceCallChatPanel from '../ConferenceCallChatPanel.svelte'
  import { SegmentedControl } from '$lib/components/ui'
  import { Avatar } from '$lib/components/shared/identity'

  const store = useCanvasConferenceStore()
  const chatStore = useCanvasChatStore()

  const conferenceChatTabs = [
    { value: 'call', label: 'Call' },
    { value: 'canvas', label: 'Canvas' }
  ]
</script>

<div
  transition:fly={{ x: 40, duration: 260, easing: cubicOut }}
  class="glass-card my-3 mr-3 flex w-72 shrink-0 flex-col overflow-hidden"
  role="dialog"
  aria-label={store.fullscreenPanel === 'chat' ? 'Chat' : 'People in call'}
>
  <header
    class="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3"
  >
    <h2 class="text-sm font-bold text-foreground">
      {store.fullscreenPanel === 'chat'
        ? 'Chat'
        : `People · ${store.participants.length}`}
    </h2>
    <button
      type="button"
      class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={() =>
        store.toggleFullscreenPanel(
          store.fullscreenPanel === 'chat' ? 'chat' : 'people'
        )}
      aria-label="Close panel"
    >
      <Minimize2 class="size-4" />
    </button>
  </header>

  {#if store.fullscreenPanel === 'chat'}
    <div class="border-b border-border/50 px-3 py-2">
      <SegmentedControl
        value={store.fullscreenChatTab}
        items={conferenceChatTabs}
        label="Conference chat source"
        size="sm"
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
              {store.callChatUnreadCount > 9 ? '9+' : store.callChatUnreadCount}
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
    </div>

    <div class="min-h-0 flex-1">
      {#if store.fullscreenChatTab === 'call'}
        <ConferenceCallChatPanel />
      {:else}
        <CanvasChatRoomPanel userId={store.userId} alwaysVisible />
      {/if}
    </div>
  {/if}

  {#if store.fullscreenPanel === 'people'}
    <div class="min-h-0 flex-1 overflow-y-auto p-2">
      {#each store.participants as participant (participant.identity)}
        <div
          class="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/60"
        >
          <Avatar
            name={participant.name}
            fallback={participant.name.trim().slice(0, 2).toUpperCase() || 'ME'}
            color={participant.color}
            class={`size-9 text-[11px] font-bold text-[var(--canvas-avatar-foreground)] shadow-inner ${participant.isSpeaking ? 'ring-2 ring-success' : ''}`}
          />
          <span class="min-w-0 flex-1 truncate text-sm text-foreground">
            {participant.isLocal ? 'You' : participant.name}
          </span>
          <button
            type="button"
            class={`flex size-7 items-center justify-center rounded-full transition ${
              store.pinnedIdentity === participant.identity
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            onclick={() => store.pin(participant.identity)}
            aria-label={`${store.pinnedIdentity === participant.identity ? 'Unpin' : 'Pin'} ${participant.isLocal ? 'yourself' : participant.name}`}
            aria-pressed={store.pinnedIdentity === participant.identity}
          >
            <Pin class="size-3.5" aria-hidden="true" />
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
</div>
