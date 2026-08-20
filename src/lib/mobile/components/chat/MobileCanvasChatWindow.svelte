<script lang="ts">
  import { MessageSquare, Sparkles } from 'lucide-svelte'
  import { BottomSheet, SegmentedControl } from '$lib/components/ui'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import MobileCanvasAssistantPanel from '$lib/mobile/components/chat/MobileCanvasAssistantPanel.svelte'
  import MobileCanvasChatRoomPanel from '$lib/mobile/components/chat/MobileCanvasChatRoomPanel.svelte'

  let { canvasId, userId } = $props<{
    canvasId: string
    userId: string
  }>()

  const store = useCanvasChatStore()
  const chatTabs = [
    { value: 'chat', label: 'Chat' },
    { value: 'assistant', label: 'Assistant' }
  ]

  function close() {
    store.minimize()
  }
</script>

{#if store.open}
  <BottomSheet
    open={store.open}
    onOpenChange={(nextOpen) => {
      if (!nextOpen) close()
    }}
    title="Canvas chat"
    handleLabel="Close canvas chat"
  >
    {#snippet header()}
      <div class="border-b border-border/60 px-4 pb-3">
        <SegmentedControl
          value={store.activeTab}
          items={chatTabs}
          label="Chat tabs"
          onValueChange={(value) => {
            if (value === 'chat' || value === 'assistant') store.setTab(value)
          }}
        >
          {#snippet item(option)}
            {#if option.value === 'chat'}
              <MessageSquare class="size-3.5" aria-hidden="true" />
            {:else}
              <Sparkles class="size-3.5" aria-hidden="true" />
            {/if}
            <span class="truncate">{option.label}</span>
            {#if option.value === 'chat' && store.unreadCount > 0 && store.activeTab !== 'chat'}
              <span
                class="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
              >
                {store.unreadCount > 9 ? '9+' : store.unreadCount}
              </span>
            {/if}
          {/snippet}
        </SegmentedControl>
      </div>
    {/snippet}

    <div class={store.activeTab === 'chat' ? 'min-h-0 flex-1' : 'hidden'}>
      <MobileCanvasChatRoomPanel {userId} />
    </div>
    <div class={store.activeTab === 'assistant' ? 'min-h-0 flex-1' : 'hidden'}>
      <MobileCanvasAssistantPanel {canvasId} />
    </div>
  </BottomSheet>
{/if}
