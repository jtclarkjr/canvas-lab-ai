<script lang="ts">
  import { History } from 'lucide-svelte'
  import CanvasHistoryDrawer from '#lib/components/canvas/workspace/CanvasHistoryDrawer.svelte'

  let { canvasId } = $props<{
    canvasId: string
  }>()

  let open = $state(false)
</script>

<button
  type="button"
  class="toolbar-pill toolbar-button"
  onclick={() => (open = true)}
  aria-label="Open canvas history"
  aria-expanded={open}
  aria-controls="canvas-history-drawer"
>
  <History class="size-4" aria-hidden="true" />
</button>

<CanvasHistoryDrawer id="canvas-history-drawer" {canvasId} bind:open />
