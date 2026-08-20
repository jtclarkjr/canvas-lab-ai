<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export type SkeletonShape = 'rectangle' | 'circle' | 'text'
  export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
    shape?: SkeletonShape
    animated?: boolean
    label?: string
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    shape = 'rectangle',
    animated = true,
    label,
    class: className,
    ...rest
  }: SkeletonProps = $props()
</script>

<div
  {...rest}
  class={cn(
    'bg-muted',
    shape === 'rectangle' && 'rounded-xl',
    shape === 'circle' && 'aspect-square rounded-full',
    shape === 'text' && 'h-4 rounded',
    animated && 'animate-pulse motion-reduce:animate-none',
    className
  )}
  role={label ? 'status' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
></div>
