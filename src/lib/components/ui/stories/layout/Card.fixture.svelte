<script lang="ts">
  import Card from '../../layout/Card.svelte'

  let {
    variant = 'default',
    padding = 'md',
    interactive = false,
    selected = false,
    asChild = false
  } = $props<{
    variant?: 'default' | 'muted' | 'glass'
    padding?: 'none' | 'sm' | 'md' | 'lg'
    interactive?: boolean
    selected?: boolean
    asChild?: boolean
  }>()
</script>

{#snippet content()}
  <p class="text-xs font-bold uppercase tracking-wide text-primary">Canvas</p>
  <h2 class="mt-1 text-lg font-semibold">Component architecture</h2>
  <p class="mt-2 text-sm leading-6 text-muted-foreground">
    Feature tiles keep their content while sharing one surface contract.
  </p>
{/snippet}

<div class="min-h-56 bg-background p-6">
  {#if asChild}
    <Card {variant} {padding} {interactive} {selected} class="max-w-sm">
      {#snippet child({ props })}
        <a {...props} href="#component-architecture" data-testid="card-child">
          {@render content()}
        </a>
      {/snippet}
    </Card>
  {:else}
    <Card
      as="article"
      {variant}
      {padding}
      {interactive}
      {selected}
      class="max-w-sm"
      tabindex={interactive ? 0 : undefined}
    >
      {@render content()}
    </Card>
  {/if}
</div>
