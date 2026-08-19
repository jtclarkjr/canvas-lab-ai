<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements'

  export type InputProps = HTMLInputAttributes & {
    invalid?: boolean
    ref?: HTMLInputElement | null
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    value = $bindable(),
    ref = $bindable(null),
    invalid = false,
    class: className,
    ...rest
  }: InputProps = $props()
</script>

<input
  bind:this={ref}
  {...rest}
  bind:value
  aria-invalid={invalid || undefined}
  class={cn(
    'h-10 w-full rounded-xl border border-input bg-background/70 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
    invalid && 'border-destructive focus:border-destructive',
    className
  )}
/>
