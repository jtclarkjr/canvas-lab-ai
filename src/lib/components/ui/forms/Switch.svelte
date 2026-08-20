<script lang="ts" module>
  export type SwitchProps = {
    checked?: boolean
    label: string
    id?: string
    class?: string
    name?: string
    value?: string
    required?: boolean
    disabled?: boolean
    'aria-describedby'?: string
    onCheckedChange?: (checked: boolean) => void
  }
</script>

<script lang="ts">
  import { Switch as BitsSwitch } from 'bits-ui'
  import { cn } from '$lib/utils'

  let {
    checked = $bindable(false),
    label,
    id,
    name,
    value,
    required = false,
    onCheckedChange,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    class: className
  }: SwitchProps = $props()
</script>

<BitsSwitch.Root
  bind:checked
  {id}
  {name}
  {value}
  {required}
  {disabled}
  {onCheckedChange}
  aria-label={label}
  aria-describedby={ariaDescribedBy}
  class={cn(
    'group inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-muted p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
    className
  )}
>
  <BitsSwitch.Thumb
    class="block size-5 rounded-full bg-background shadow-sm transition-transform group-data-[state=checked]:translate-x-5 motion-reduce:transition-none"
  />
</BitsSwitch.Root>
