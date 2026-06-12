<script lang="ts">
  import { provideCanvasChatStore } from '$lib/stores/canvas/chat/canvas-chat.svelte'
  import CanvasChatLauncher from '$lib/components/canvas/chat/CanvasChatLauncher.svelte'
  import CanvasChatWindow from '$lib/components/canvas/chat/CanvasChatWindow.svelte'

  let { canvasId, userId } = $props<{
    canvasId: string
    userId: string
  }>()

  const store = provideCanvasChatStore({
    getCanvasId: () => canvasId,
    getUserId: () => userId
  })

  let launcherEl = $state<HTMLButtonElement | null>(null)
</script>

<CanvasChatLauncher bind:buttonEl={launcherEl} />

{#if store.hasOpened}
  <!-- Mounted lazily on first open, then kept alive while minimized so an
       in-flight assistant stream survives and reopening is instant. -->
  <CanvasChatWindow
    {canvasId}
    {userId}
    getLauncherRect={() => launcherEl?.getBoundingClientRect() ?? null}
  />
{/if}
