<script lang="ts">
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasAssistantThread from '$lib/components/canvas/chat/CanvasAssistantThread.svelte'

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
  <div
    class="flex h-full flex-col justify-end gap-3 px-4 py-4"
    aria-hidden="true"
  >
    <div class="h-9 w-3/5 animate-pulse rounded-2xl bg-muted/80"></div>
    <div class="ml-auto h-9 w-2/5 animate-pulse rounded-2xl bg-muted/60"></div>
    <div class="h-9 w-4/5 animate-pulse rounded-2xl bg-muted/80"></div>
  </div>
{/if}
