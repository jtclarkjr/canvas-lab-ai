<script lang="ts">
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { useCanvasConferenceStoreOptional } from '$lib/stores/conference/index.svelte'
  import MobileCanvasChatWindow from '$lib/mobile/components/chat/MobileCanvasChatWindow.svelte'

  let { canvasId, userId } = $props<{
    canvasId: string
    userId: string
  }>()

  const store = useCanvasChatStore()
  const conference = useCanvasConferenceStoreOptional()

  $effect(() => {
    conference?.setChatOpen(store.open)
  })
</script>

{#if store.hasOpened}
  <MobileCanvasChatWindow {canvasId} {userId} />
{/if}
