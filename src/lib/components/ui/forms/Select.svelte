<script lang="ts" module>
  import type { HTMLSelectAttributes } from 'svelte/elements'

  export type SelectOption = {
    value: string
    label: string
    disabled?: boolean
  }

  export type SelectProps = Omit<HTMLSelectAttributes, 'children'> & {
    options: readonly SelectOption[]
    placeholder?: string
    invalid?: boolean
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils'

  let {
    value = $bindable(),
    options,
    placeholder,
    invalid = false,
    class: className,
    ...rest
  }: SelectProps = $props()
</script>

<select
  {...rest}
  bind:value
  aria-invalid={invalid || undefined}
  class={cn(
    'h-10 w-full rounded-xl border border-input bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
    invalid && 'border-destructive focus:border-destructive',
    className
  )}
>
  {#if placeholder}
    <option value="" disabled>{placeholder}</option>
  {/if}
  {#each options as option (option.value)}
    <option value={option.value} disabled={option.disabled}>
      {option.label}
    </option>
  {/each}
</select>
