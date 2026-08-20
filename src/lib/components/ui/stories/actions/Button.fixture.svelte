<script lang="ts">
  import Button from '../../actions/Button.svelte'
  import type { ButtonSize, ButtonVariant } from '../../actions/Button.svelte'

  let {
    label = 'Save changes',
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false
  } = $props<{
    label?: string
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    loading?: boolean
  }>()

  let presses = $state(0)
</script>

<div class="flex min-h-32 flex-col items-start justify-center gap-3 p-6">
  <Button {variant} {size} {disabled} {loading} onclick={() => (presses += 1)}>
    {label}
  </Button>
  <output aria-live="polite">Pressed {presses} times</output>
</div>
