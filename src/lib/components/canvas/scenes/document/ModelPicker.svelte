<script lang="ts">
  import { Cpu } from 'lucide-svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { getModelOption, modelOptions } from '$lib/scenes/models'

  let {
    modelId,
    onModelChange,
    disabled = false,
    side = 'bottom',
    compact = false
  } = $props<{
    modelId: string
    onModelChange: (modelId: string) => void
    disabled?: boolean
    side?: 'top' | 'bottom'
    compact?: boolean
  }>()

  let open = $state(false)

  const selected = $derived(getModelOption(modelId))
</script>

<Popover
  bind:open
  id="scene-model-picker"
  label="Choose model"
  role="menu"
  align="start"
  {side}
>
  {#snippet trigger({ id: popoverId, expanded })}
    <button
      type="button"
      class={`flex items-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition hover:text-foreground disabled:opacity-50 ${
        compact
          ? 'h-7 max-w-[112px] gap-1 px-2 text-[11px]'
          : 'h-8 gap-1.5 px-3 text-xs'
      }`}
      onclick={() => (open = !open)}
      aria-expanded={expanded}
      aria-haspopup="menu"
      aria-controls={popoverId}
      aria-label={`AI model: ${selected?.label ?? 'Model'}`}
      {disabled}
    >
      <Cpu class="size-3.5 shrink-0" aria-hidden="true" />
      <span class="min-w-0 truncate">{selected?.label ?? 'Model'}</span>
    </button>
  {/snippet}

  <div class="flex min-w-[200px] flex-col gap-0.5">
    {#each modelOptions as option (option.id)}
      <button
        type="button"
        role="menuitemradio"
        aria-checked={option.id === modelId}
        class={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition ${
          option.id === modelId
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted'
        }`}
        onclick={() => {
          onModelChange(option.id)
          open = false
        }}
      >
        <span>{option.label}</span>
        <span class="text-xs uppercase text-muted-foreground"
          >{option.provider}</span
        >
      </button>
    {/each}
  </div>
</Popover>
