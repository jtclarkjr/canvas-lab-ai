<script lang="ts">
  import { useCanvasChatStore } from '$lib/stores/canvas/chat/canvas-chat.svelte'
  import { useCanvasConferenceStoreOptional } from '$lib/stores/canvas/conference/index.svelte'
  import CanvasChatLauncher from '$lib/components/canvas/chat/CanvasChatLauncher.svelte'
  import CanvasChatWindow from '$lib/components/canvas/chat/CanvasChatWindow.svelte'

  let { canvasId, userId } = $props<{
    canvasId: string
    userId: string
  }>()

  // Provided from CanvasWorkspace so the call's fullscreen view can embed
  // the chat panel too.
  const store = useCanvasChatStore()

  // The call PiP anchors above the chat window when both sit bottom-right;
  // this one-way bridge tells the conference store when chat is open.
  const conference = useCanvasConferenceStoreOptional()
  $effect(() => {
    conference?.setChatOpen(store.open)
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
