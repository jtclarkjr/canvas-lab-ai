<script lang="ts">
  import { Settings } from 'lucide-svelte'
  import IconButton from '../../actions/IconButton.svelte'

  let { label = 'Open settings', disabled = false } = $props<{
    label?: string
    disabled?: boolean
  }>()

  let presses = $state(0)
</script>

<div class="flex min-h-32 items-center gap-4 p-6">
  <IconButton
    {label}
    {disabled}
    variant="outline"
    onclick={() => (presses += 1)}
  >
    <Settings class="size-4" aria-hidden="true" />
  </IconButton>
  <output aria-live="polite">Pressed {presses} times</output>
</div>
