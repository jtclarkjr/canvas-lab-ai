<script lang="ts">
  import { MessageSquare, Minimize2, Sparkles } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasAssistantPanel from '$lib/components/canvas/chat/CanvasAssistantPanel.svelte'
  import CanvasChatRoomPanel from '$lib/components/canvas/chat/CanvasChatRoomPanel.svelte'

  let { canvasId, userId } = $props<{
    canvasId: string
    userId: string
  }>()

  const store = useCanvasChatStore()
  const tabClass = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition ${
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
    }`
</script>

<div
  class="fixed inset-x-0 bottom-0 z-50 flex h-[min(42rem,calc(100dvh-1rem))] cursor-auto flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card text-card-foreground shadow-2xl"
  style:display={store.open ? 'flex' : 'none'}
  role="dialog"
  aria-label="Canvas chat"
  data-camera-exempt
>
  <header
    class="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5"
  >
    <div class="flex items-center gap-1" role="tablist" aria-label="Chat tabs">
      <button
        type="button"
        role="tab"
        aria-selected={store.activeTab === 'chat'}
        class={tabClass(store.activeTab === 'chat')}
        onclick={() => store.setTab('chat')}
      >
        <MessageSquare class="size-3.5" />
        Chat
        {#if store.unreadCount > 0 && store.activeTab !== 'chat'}
          <span
            class="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
          >
            {store.unreadCount > 9 ? '9+' : store.unreadCount}
          </span>
        {/if}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={store.activeTab === 'assistant'}
        class={tabClass(store.activeTab === 'assistant')}
        onclick={() => store.setTab('assistant')}
      >
        <Sparkles class="size-3.5" />
        Assistant
      </button>
    </div>

    <button
      type="button"
      class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={() => store.minimize()}
      aria-label="Minimize chat"
    >
      <Minimize2 class="size-4" aria-hidden="true" />
    </button>
  </header>

  <div class={store.activeTab === 'chat' ? 'min-h-0 flex-1' : 'hidden'}>
    <CanvasChatRoomPanel {userId} />
  </div>
  <div class={store.activeTab === 'assistant' ? 'min-h-0 flex-1' : 'hidden'}>
    <CanvasAssistantPanel {canvasId} />
  </div>
</div>
