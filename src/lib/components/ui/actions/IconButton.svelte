<script lang="ts" module>
  import type { Snippet } from 'svelte'
  import type { ButtonProps } from './Button.svelte'

  export type IconButtonProps = Omit<ButtonProps, 'children' | 'size'> & {
    label: string
    tooltip?: string
    children?: Snippet
  }
</script>

<script lang="ts">
  import Button from './Button.svelte'

  let {
    label,
    tooltip,
    ref = $bindable(null),
    children,
    class: className,
    ...rest
  }: IconButtonProps = $props()
</script>

<Button
  bind:ref
  {...rest}
  size="icon"
  class={className}
  aria-label={label}
  title={tooltip ?? label}
>
  {@render children?.()}
</Button>
