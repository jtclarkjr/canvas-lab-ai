<script lang="ts">
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasAssistantThread from '$lib/components/canvas/chat/CanvasAssistantThread.svelte'
  import { ChatLoadingSkeleton } from '$lib/components/shared/chat'

  let { canvasId } = $props<{ canvasId: string }>()

  const store = useCanvasChatStore()
</script>

{#if store.assistantActiveThreadId && store.assistantInitialMessages !== null}
  <!-- Keyed so switching canvases rebuilds the Chat instance with the new
       thread's history. -->
  {#key `${canvasId}:${store.assistantActiveThreadId}`}
    <CanvasAssistantThread
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
  <ChatLoadingSkeleton rows={3} class="h-full" />
{/if}
