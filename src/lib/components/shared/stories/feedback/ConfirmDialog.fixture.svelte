<script lang="ts">
  import { Button } from '$lib/components/ui'
  import ConfirmDialog from '../../feedback/ConfirmDialog.svelte'

  let { initialOpen = false, destructive = true } = $props<{
    initialOpen?: boolean
    destructive?: boolean
  }>()

  let open = $state(false)
  let result = $state('No decision')

  $effect(() => {
    open = initialOpen
  })
</script>

<div class="flex min-h-48 flex-col items-center justify-center gap-4 p-6">
  <Button onclick={() => (open = true)}>Remove collaborator</Button>
  <p data-testid="decision" class="text-sm text-muted-foreground">{result}</p>
</div>

<ConfirmDialog
  bind:open
  title="Remove collaborator?"
  message="They will immediately lose access to this canvas."
  confirmLabel={destructive ? 'Remove' : 'Continue'}
  {destructive}
  onConfirm={() => (result = 'Confirmed')}
/>
