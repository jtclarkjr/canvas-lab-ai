<script lang="ts">
  import { MessageCircle } from 'lucide-svelte'
  import { IconButton } from '$lib/components/ui'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'

  let { buttonEl = $bindable(null) } = $props<{
    buttonEl?: HTMLButtonElement | null
  }>()

  const store = useCanvasChatStore()
</script>

<!-- bottom-[156px]: the zoom stack in CanvasZoomControls (3 × h-9
     buttons + 2 × gap-2 = 124px) + its bottom-6 (24px) + an 8px gap. While
     the window is open the launcher hides but stays in the DOM so the
     minimize FLIP can measure its live rect. -->
<IconButton
  bind:ref={buttonEl}
  label={store.unreadCount > 0 && !store.open
    ? `Open canvas chat (${store.unreadCount} unread message${store.unreadCount !== 1 ? 's' : ''})`
    : 'Open canvas chat'}
  variant="secondary"
  class={`toolbar-pill toolbar-button fixed bottom-[156px] right-6 z-30 transition-opacity ${
    store.open ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
  }`}
  onclick={() => store.openWindow()}
>
  <MessageCircle class="size-4" aria-hidden="true" />
  {#if store.unreadCount > 0 && !store.open}
    <span
      class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
      aria-hidden="true"
    >
      {store.unreadCount > 9 ? '9+' : store.unreadCount}
    </span>
  {/if}
</IconButton>
