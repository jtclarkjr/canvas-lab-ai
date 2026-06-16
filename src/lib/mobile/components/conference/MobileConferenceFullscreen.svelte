<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { scale } from 'svelte/transition'
  import { LoaderCircle, MessageSquare, Minimize2, Users } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import MobileConferenceControls from '$lib/mobile/components/conference/MobileConferenceControls.svelte'
  import MobileConferenceSheet from '$lib/mobile/components/conference/MobileConferenceSheet.svelte'
  import MobileConferenceTileGrid from '$lib/mobile/components/conference/MobileConferenceTileGrid.svelte'

  const store = useCanvasConferenceStore()
  const chatStore = useCanvasChatStore()

  const chatUnreadCount = $derived(
    chatStore.unreadCount + store.callChatUnreadCount
  )
  const statusLabel = $derived.by(() => {
    if (store.status === 'connecting') return 'Joining...'
    if (store.status === 'reconnecting') return 'Reconnecting...'
    return `Call · ${store.participants.length}`
  })

  function togglePanel(panel: 'chat' | 'people') {
    store.toggleFullscreenPanel(panel)
  }

  $effect(() => {
    if (
      store.fullscreenPanel === 'chat' &&
      store.fullscreenChatTab === 'canvas'
    ) {
      void chatStore.ensureLoaded()
      void chatStore.ensureMembersLoaded()
    }
  })

  $effect(() => {
    void chatStore.entries.length
    if (
      store.fullscreenPanel === 'chat' &&
      store.fullscreenChatTab === 'canvas'
    ) {
      chatStore.markChatRead()
    }
  })

  $effect(() => {
    void store.callChatEntries.length
    if (
      store.fullscreenPanel === 'chat' &&
      store.fullscreenChatTab === 'call'
    ) {
      store.markCallChatRead()
    }
  })
</script>

<div
  class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background"
  style="transform-origin:top center"
  transition:scale={{
    start: 0.94,
    opacity: 0.35,
    duration: 220,
    easing: cubicOut
  }}
  role="dialog"
  aria-label="Call"
  data-camera-exempt
>
  <div
    class="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
  >
    <div class="flex items-center gap-2">
      <div
        class="pointer-events-auto flex h-10 min-w-0 items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 text-sm font-semibold text-card-foreground shadow-lg backdrop-blur"
      >
        {#if store.status === 'connecting' || store.status === 'reconnecting'}
          <LoaderCircle
            class="size-4 shrink-0 animate-spin"
            aria-hidden="true"
          />
        {/if}
        <span class="truncate">{statusLabel}</span>
      </div>

      <div class="pointer-events-auto ml-auto flex items-center gap-1">
        <button
          type="button"
          class={`relative flex size-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-card-foreground shadow-lg backdrop-blur transition ${
            store.fullscreenPanel === 'people' ? 'text-primary' : ''
          }`}
          onclick={() => togglePanel('people')}
          aria-label="People in call"
          aria-pressed={store.fullscreenPanel === 'people'}
        >
          <Users class="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          class={`relative flex size-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-card-foreground shadow-lg backdrop-blur transition ${
            store.fullscreenPanel === 'chat' ? 'text-primary' : ''
          }`}
          onclick={() => togglePanel('chat')}
          aria-label={chatUnreadCount > 0
            ? `Chat (${chatUnreadCount} unread)`
            : 'Chat'}
          aria-pressed={store.fullscreenPanel === 'chat'}
        >
          <MessageSquare class="size-5" aria-hidden="true" />
          {#if chatUnreadCount > 0 && store.fullscreenPanel !== 'chat'}
            <span
              class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
            >
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </span>
          {/if}
        </button>

        <button
          type="button"
          class="flex size-10 items-center justify-center rounded-full border border-border/70 bg-card/90 text-card-foreground shadow-lg backdrop-blur transition"
          onclick={() => store.setViewMode('bar')}
          aria-label="Minimize call"
        >
          <Minimize2 class="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>

  <div
    class="min-h-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-[calc(env(safe-area-inset-top)+4rem)]"
  >
    <MobileConferenceTileGrid />
  </div>

  <MobileConferenceControls />

  {#if store.fullscreenPanel !== 'none'}
    <MobileConferenceSheet />
  {/if}
</div>
