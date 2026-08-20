<script lang="ts" module>
  import type { HTMLAttributes } from 'svelte/elements'

  export type AvatarProps = Omit<
    HTMLAttributes<HTMLSpanElement>,
    'children'
  > & {
    name: string
    src?: string | null
    fallback?: string
    color?: string
    imageClass?: string
    decorative?: boolean
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    name,
    src,
    fallback,
    color,
    imageClass,
    decorative = true,
    class: className,
    style,
    ...rest
  }: AvatarProps = $props()

  let failed = $state(false)
  const initials = $derived(
    fallback ??
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
  )
  const avatarStyle = $derived(
    color ? `background-color:${color};${style ?? ''}` : style
  )

  $effect(() => {
    void src
    failed = false
  })
</script>

<span
  {...rest}
  class={cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-semibold text-primary',
    className
  )}
  style={avatarStyle}
  role={decorative ? undefined : 'img'}
  aria-label={decorative ? undefined : name}
>
  {#if src && !failed}
    <img
      {src}
      alt=""
      class={cn('size-full object-cover', imageClass)}
      onerror={() => (failed = true)}
    />
  {:else}
    <span aria-hidden="true">{initials}</span>
  {/if}
</span>
