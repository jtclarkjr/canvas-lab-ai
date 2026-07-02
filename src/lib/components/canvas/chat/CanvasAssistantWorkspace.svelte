<script lang="ts">
  import { PanelLeft } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasAssistantHistorySidebar from '$lib/components/canvas/chat/CanvasAssistantHistorySidebar.svelte'
  import CanvasAssistantPanel from '$lib/components/canvas/chat/CanvasAssistantPanel.svelte'

  let { canvasId } = $props<{ canvasId: string }>()

  const store = useCanvasChatStore()
  let mobileHistoryOpen = $state(false)
  const fullscreen = $derived(store.displayMode === 'fullscreen')

  $effect(() => {
    if (!fullscreen) {
      mobileHistoryOpen = false
    }
  })
</script>

<div class="relative flex h-full min-h-0">
  {#if fullscreen}
    <div class="hidden md:flex">
      <CanvasAssistantHistorySidebar />
    </div>

    <button
      type="button"
      class="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground md:hidden"
      onclick={() => (mobileHistoryOpen = true)}
      aria-label="Open assistant histories"
    >
      <PanelLeft class="size-4" aria-hidden="true" />
    </button>
  {/if}

  <div class="min-w-0 flex-1">
    <CanvasAssistantPanel {canvasId} />
  </div>

  {#if fullscreen && mobileHistoryOpen}
    <div
      class="absolute inset-0 z-30 bg-background/50 backdrop-blur-sm md:hidden"
    >
      <button
        type="button"
        class="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close assistant histories"
        onclick={() => (mobileHistoryOpen = false)}
      ></button>
      <div class="relative h-full w-[min(18rem,calc(100vw-3rem))] shadow-2xl">
        <CanvasAssistantHistorySidebar />
      </div>
    </div>
  {/if}
</div>
