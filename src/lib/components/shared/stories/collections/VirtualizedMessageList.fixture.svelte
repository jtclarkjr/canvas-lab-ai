<script lang="ts">
  import VirtualizedMessageList from '../../collections/VirtualizedMessageList.svelte'

  let { count = 100 } = $props<{ count?: number }>()
  const items = $derived(
    Array.from({ length: count }, (_, index) => ({
      id: `message-${index + 1}`,
      title: `Message ${index + 1}`,
      body: `Deterministic message content ${index + 1}`
    }))
  )
</script>

<div
  class="flex h-72 w-full max-w-xl rounded-2xl border border-border bg-background"
>
  <VirtualizedMessageList
    {items}
    keyForItem={(entry) => entry.id}
    estimateSize={64}
    gap={8}
    anchorTo="start"
    initialScroll="start"
    followMode="none"
    className="virtualized-story-scroll p-3"
  >
    {#snippet item(entry)}
      <article class="rounded-xl border border-border bg-card p-3">
        <h3 class="text-sm font-semibold">{entry.title}</h3>
        <p class="text-xs text-muted-foreground">{entry.body}</p>
      </article>
    {/snippet}

    {#snippet empty()}
      <p class="m-auto text-sm text-muted-foreground">No messages</p>
    {/snippet}
  </VirtualizedMessageList>
</div>
