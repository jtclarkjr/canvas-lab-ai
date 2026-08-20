<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'destructive'
  export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

  export type ButtonProps = Omit<HTMLButtonAttributes, 'children'> & {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    ref?: HTMLButtonElement | null
    children?: Snippet
  }
</script>

<script lang="ts">
  import { Button as BitsButton } from 'bits-ui'
  import { cn } from '$lib/utils'

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    type = 'button',
    ref = $bindable(null),
    children,
    class: className,
    ...rest
  }: ButtonProps = $props()

  const variantClass = $derived(
    {
      primary:
        'bg-primary text-primary-foreground hover:brightness-110 shadow-sm',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
      outline:
        'border border-border/80 bg-background/70 text-foreground hover:border-primary/50 hover:bg-accent',
      ghost:
        'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      destructive:
        'bg-destructive text-destructive-foreground hover:brightness-110 shadow-sm'
    }[variant]
  )

  const sizeClass = $derived(
    {
      sm: 'h-8 gap-1.5 rounded-full px-3 text-xs',
      md: 'h-10 gap-2 rounded-full px-4 text-sm',
      lg: 'h-12 gap-2 rounded-2xl px-5 text-base',
      icon: 'size-10 rounded-full p-0'
    }[size]
  )
</script>

<BitsButton.Root
  bind:ref
  {...rest}
  {type}
  disabled={disabled || loading}
  aria-busy={loading || undefined}
  class={cn(
    'inline-flex shrink-0 items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
    variantClass,
    sizeClass,
    className
  )}
>
  {#if loading}
    <span
      class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
    <span class="sr-only">Loading</span>
  {/if}
  {@render children?.()}
</BitsButton.Root>
