<script lang="ts">
  import { PanelLeft } from 'lucide-svelte'
  import { IconButton } from '$lib/components/ui'
  import CanvasAssistantHistorySidebar from '$lib/components/canvas/chat/CanvasAssistantHistorySidebar.svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import MobileCanvasAssistantThread from '$lib/mobile/components/chat/MobileCanvasAssistantThread.svelte'
  import { ChatLoadingSkeleton } from '$lib/components/shared/chat'

  let { canvasId } = $props<{ canvasId: string }>()

  const store = useCanvasChatStore()
  let historyOpen = $state(false)
</script>

<div class="relative h-full min-h-0">
  <IconButton
    label="Open assistant histories"
    variant="outline"
    class="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition active:bg-muted"
    onclick={() => (historyOpen = true)}
  >
    <PanelLeft class="size-4" aria-hidden="true" />
  </IconButton>

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
    <ChatLoadingSkeleton rows={3} size="md" class="h-full" />
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
