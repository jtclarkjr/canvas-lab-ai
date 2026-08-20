<script lang="ts">
  import { Button } from '$lib/components/ui'
  import CanvasSearchDialog from '../CanvasSearchDialog.svelte'
  import { ownerCanvas, sharedCanvas } from '../home/stories/fixtures'

  let { loading = false } = $props<{ loading?: boolean }>()
  let open = $state(true)
  let selected = $state('None')
</script>

<div class="flex min-h-48 flex-col items-center justify-center gap-3 p-6">
  <Button onclick={() => (open = true)}>Search canvases</Button>
  <p data-testid="selected-canvas">Selected: {selected}</p>
</div>

<CanvasSearchDialog
  bind:open
  canvases={loading ? [] : [ownerCanvas, sharedCanvas]}
  isLoading={loading}
  onSelect={(canvas) => {
    selected = canvas.title
  }}
/>
