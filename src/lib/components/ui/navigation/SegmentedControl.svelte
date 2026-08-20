<script lang="ts" module>
  import type { Snippet } from 'svelte'

  export type SegmentedControlItem = {
    value: string
    label: string
    disabled?: boolean
    title?: string
  }

  export type SegmentedControlProps = {
    value?: string
    onValueChange?: (value: string) => void
    items: SegmentedControlItem[]
    label: string
    size?: 'sm' | 'md'
    variant?: 'default' | 'unstyled'
    loop?: boolean
    class?: string
    style?: string
    listClass?: string
    triggerClass?: string
    decoration?: Snippet
    item?: Snippet<[SegmentedControlItem, boolean]>
  }
</script>

<script lang="ts">
  import { Tabs } from 'bits-ui'
  import { cn } from '$lib/utils'

  let {
    value = $bindable(''),
    onValueChange,
    items,
    label,
    size = 'md',
    variant = 'default',
    loop = true,
    style,
    listClass,
    triggerClass,
    decoration,
    item,
    class: className
  }: SegmentedControlProps = $props()

  function select(nextValue: string) {
    value = nextValue
    onValueChange?.(nextValue)
  }
</script>

<Tabs.Root
  {value}
  onValueChange={select}
  activationMode="automatic"
  {loop}
  {style}
  class={cn('min-w-0', className)}
>
  {@render decoration?.()}
  <Tabs.List
    aria-label={label}
    class={cn(
      variant === 'default' && 'flex min-w-0 rounded-full bg-muted/50 p-1',
      listClass
    )}
  >
    {#each items as option (option.value)}
      <Tabs.Trigger
        value={option.value}
        disabled={option.disabled}
        aria-label={option.label}
        title={option.title}
        class={cn(
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' &&
            'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 font-bold text-foreground transition data-[state=active]:bg-foreground data-[state=active]:text-background',
          variant === 'default' &&
            (size === 'sm' ? 'h-7 text-xs' : 'h-9 text-xs'),
          triggerClass
        )}
      >
        {#if item}
          {@render item(option, value === option.value)}
        {:else}
          <span class="truncate">{option.label}</span>
        {/if}
      </Tabs.Trigger>
    {/each}
  </Tabs.List>
</Tabs.Root>
