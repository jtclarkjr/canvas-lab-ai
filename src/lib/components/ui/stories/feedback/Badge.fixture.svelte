<script lang="ts">
  import Badge from '../../feedback/Badge.svelte'
  import type { BadgeVariant } from '../../feedback/Badge.svelte'

  let { label = 'Editor', variant = 'neutral' } = $props<{
    label?: string
    variant?: BadgeVariant
  }>()
</script>

<div class="flex min-h-24 items-center p-6">
  <Badge {variant}>{label}</Badge>
</div>
