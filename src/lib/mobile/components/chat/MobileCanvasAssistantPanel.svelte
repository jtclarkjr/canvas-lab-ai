<script lang="ts">
  import { PanelLeft } from 'lucide-svelte'
  import CanvasAssistantHistorySidebar from '$lib/components/canvas/chat/CanvasAssistantHistorySidebar.svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import MobileCanvasAssistantThread from '$lib/mobile/components/chat/MobileCanvasAssistantThread.svelte'

  let { canvasId } = $props<{ canvasId: string }>()

  const store = useCanvasChatStore()
  let historyOpen = $state(false)
</script>

<div class="relative h-full min-h-0">
  <button
    type="button"
    class="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition active:bg-muted"
    onclick={() => (historyOpen = true)}
    aria-label="Open assistant histories"
  >
    <PanelLeft class="size-4" aria-hidden="true" />
  </button>

  {#if store.assistantActiveThreadId && store.assistantInitialMessages !== null}
    {#key `${canvasId}:${store.assistantActiveThreadId}`}
      <MobileCanvasAssistantThread
        {canvasId}
        threadId={store.assistantActiveThreadId}
        initialMessages={store.assistantInitialMessages}
      />
    {/key}
  {:else if store.assistantLoadError || store.assistantThreadsLoadError}
    <div
      class="flex h-full items-center justify-center px-6 text-center text-sm text-destructive"
      role="alert"
    >
      {store.assistantLoadError ?? store.assistantThreadsLoadError}
    </div>
  {:else}
    <div
      class="flex h-full flex-col justify-end gap-3 px-4 py-4"
      aria-hidden="true"
    >
      <div class="h-10 w-3/5 animate-pulse rounded-2xl bg-muted/80"></div>
      <div
        class="ml-auto h-10 w-2/5 animate-pulse rounded-2xl bg-muted/60"
      ></div>
      <div class="h-10 w-4/5 animate-pulse rounded-2xl bg-muted/80"></div>
    </div>
  {/if}

  {#if historyOpen}
    <div class="absolute inset-0 z-30 bg-background/50 backdrop-blur-sm">
      <button
        type="button"
        class="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close assistant histories"
        onclick={() => (historyOpen = false)}
      ></button>
      <div class="relative h-full w-[min(18rem,calc(100vw-3rem))] shadow-2xl">
        <CanvasAssistantHistorySidebar />
      </div>
    </div>
  {/if}
</div>
