<script lang="ts" module>
  export type ChatLoadingSkeletonProps = {
    rows?: 3 | 4
    size?: 'sm' | 'md'
    label?: string
    class?: string
  }
</script>

<script lang="ts">
  import { Skeleton } from '$lib/components/ui'
  import { cn } from '$lib/utils'

  let {
    rows = 4,
    size = 'sm',
    label = 'Loading messages',
    class: className
  }: ChatLoadingSkeletonProps = $props()

  const patterns = [
    { width: 'w-3/5', own: false },
    { width: 'w-2/5', own: true },
    { width: 'w-4/5', own: false },
    { width: 'w-3/5', own: true }
  ]
</script>

<div
  class={cn('flex flex-col justify-end gap-3 px-4 py-4', className)}
  role="status"
  aria-label={label}
>
  {#each patterns.slice(0, rows) as row, index (index)}
    <Skeleton
      class={cn(
        size === 'sm' ? 'h-9' : 'h-10',
        row.width,
        row.own ? 'ml-auto bg-muted/60' : 'bg-muted/80',
        'rounded-2xl'
      )}
    />
  {/each}
</div>
