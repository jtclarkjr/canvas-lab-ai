<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export type BadgeVariant =
    | 'neutral'
    | 'primary'
    | 'success'
    | 'warning'
    | 'destructive'

  export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    variant?: BadgeVariant
    children?: Snippet
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    variant = 'neutral',
    children,
    class: className,
    ...rest
  }: BadgeProps = $props()

  const variantClass = $derived(
    {
      neutral: 'border-border bg-muted text-muted-foreground',
      primary: 'border-primary/30 bg-primary/10 text-primary',
      success: 'border-success/30 bg-success/10 text-success',
      warning: 'border-warning/30 bg-warning/10 text-warning',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive'
    }[variant]
  )
</script>

<span
  {...rest}
  class={cn(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
    variantClass,
    className
  )}
>
  {@render children?.()}
</span>
