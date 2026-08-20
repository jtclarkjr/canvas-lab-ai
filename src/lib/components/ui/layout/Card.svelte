<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'

  type CardElement = 'div' | 'article' | 'section'
  type CardVariant = 'default' | 'muted' | 'glass'
  type CardPadding = 'none' | 'sm' | 'md' | 'lg'
  type CardChildProps = HTMLAttributes<HTMLElement> & { class: string }

  type CardProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    as?: CardElement
    variant?: CardVariant
    padding?: CardPadding
    interactive?: boolean
    selected?: boolean
    child?: Snippet<[{ props: CardChildProps }]>
    children?: Snippet
  }

  let {
    as = 'div',
    variant = 'default',
    padding = 'none',
    interactive = false,
    selected = false,
    child,
    children,
    class: className,
    ...rest
  }: CardProps = $props()

  const childProps = $derived({
    props: {
      ...rest,
      class: cn(
        'rounded-xl border text-card-foreground',
        {
          default: 'border-border/70 bg-card shadow-sm',
          muted: 'border-border/60 bg-muted/35',
          glass: 'surface-border glass-card'
        }[variant],
        {
          none: '',
          sm: 'p-3',
          md: 'p-4',
          lg: 'p-6'
        }[padding],
        interactive &&
          'transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary/60 shadow-lg ring-2 ring-primary/25',
        className
      )
    }
  })
</script>

{#if child}
  {@render child(childProps)}
{:else}
  <svelte:element this={as} {...childProps.props}>
    {@render children?.()}
  </svelte:element>
{/if}
