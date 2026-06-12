<script lang="ts">
  import { MessageCircle } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/canvas/chat/canvas-chat.svelte'

  let { buttonEl = $bindable(null) } = $props<{
    buttonEl?: HTMLButtonElement | null
  }>()

  const store = useCanvasChatStore()
</script>

<!-- bottom-42 = 168px: the zoom stack in CanvasZoomControls (3 × h-10
     buttons + 2 × gap-2 = 136px) + its bottom-6 (24px) + an 8px gap. While
     the window is open the launcher hides but stays in the DOM so the
     minimize FLIP can measure its live rect. -->
<button
  bind:this={buttonEl}
  type="button"
  class={`toolbar-pill fixed bottom-42 right-6 z-30 flex h-10 w-10 items-center justify-center transition-opacity ${
    store.open ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
  }`}
  onclick={() => store.openWindow()}
  title="Canvas chat"
  aria-label="Open canvas chat"
>
  <MessageCircle class="size-4" />
  {#if store.unreadCount > 0 && !store.open}
    <span
      class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
    >
      {store.unreadCount > 9 ? '9+' : store.unreadCount}
    </span>
  {/if}
</button>
