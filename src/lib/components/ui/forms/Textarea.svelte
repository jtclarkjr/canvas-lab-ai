<script lang="ts" module>
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  export type TextareaProps = HTMLTextareaAttributes & {
    invalid?: boolean
    ref?: HTMLTextAreaElement | null
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
  }: TextareaProps = $props()
</script>

<textarea
  bind:this={ref}
  {...rest}
  bind:value
  aria-invalid={invalid || undefined}
  class={cn(
    'min-h-24 w-full resize-y rounded-xl border border-input bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
    invalid && 'border-destructive focus:border-destructive',
    className
  )}></textarea>
