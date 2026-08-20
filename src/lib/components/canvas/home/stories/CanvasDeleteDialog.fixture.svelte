<script lang="ts">
  import { Button } from '$lib/components/ui'
  import CanvasDeleteDialog from '../CanvasDeleteDialog.svelte'
  import { ownerCanvas } from './fixtures'

  let { deleting = false } = $props<{ deleting?: boolean }>()
  let open = $state(true)
  let confirmed = $state(false)
</script>

<div class="flex min-h-48 flex-col items-center justify-center gap-3 p-6">
  <Button onclick={() => (open = true)}>Open delete dialog</Button>
  <p data-testid="confirmed">Confirmed: {confirmed ? 'yes' : 'no'}</p>
</div>

<CanvasDeleteDialog
  bind:open
  canvas={ownerCanvas}
  {deleting}
  onConfirm={() => {
    confirmed = true
  }}
/>
