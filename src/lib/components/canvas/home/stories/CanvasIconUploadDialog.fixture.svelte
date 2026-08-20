<script lang="ts">
  import { Button } from '$lib/components/ui'
  import CanvasIconUploadDialog from '../CanvasIconUploadDialog.svelte'
  import { ownerCanvas } from './fixtures'

  let open = $state(true)
</script>

<div class="flex min-h-48 items-center justify-center p-6">
  <Button onclick={() => (open = true)}>Open icon dialog</Button>
</div>

<CanvasIconUploadDialog
  bind:open
  canvas={ownerCanvas}
  onChanged={() => undefined}
/>
