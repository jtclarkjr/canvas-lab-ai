<script lang="ts">
  import Popover from '../../overlays/Popover.svelte'

  let { initialOpen = false } = $props<{ initialOpen?: boolean }>()
  let open = $state(false)
  let selected = $state('Newest first')

  $effect(() => {
    open = initialOpen
  })
</script>

<div class="flex min-h-48 flex-col items-center justify-center gap-4 p-6">
  <Popover
    bind:open
    id="sort-options"
    label="Sort options"
    role="menu"
    align="start"
  >
    {#snippet trigger({ props, expanded })}
      <button
        {...props}
        type="button"
        class="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"
      >
        Sort: {selected}
        {expanded ? '▲' : '▼'}
      </button>
    {/snippet}

    <div class="grid gap-1">
      {#each ['Newest first', 'Oldest first', 'Recently edited'] as option}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={selected === option}
          class="rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          onclick={() => {
            selected = option
            open = false
          }}
        >
          {option}
        </button>
      {/each}
    </div>
  </Popover>

  <p class="text-sm text-muted-foreground" data-testid="selection">
    {selected}
  </p>
</div>
