<script lang="ts">
  import Button from '../../actions/Button.svelte'
  import BottomSheet from '../../overlays/BottomSheet.svelte'

  let { initialOpen = false } = $props<{ initialOpen?: boolean }>()
  let open = $state(false)

  $effect(() => {
    open = initialOpen
  })
</script>

<div class="flex min-h-48 items-center justify-center p-6">
  <Button onclick={() => (open = true)}>Open mobile details</Button>
</div>

<BottomSheet
  bind:open
  title="Mobile details"
  description="A scroll-aware draggable sheet"
  handleLabel="Drag down to close mobile details"
>
  {#snippet header()}
    <div class="border-b border-border/70 px-4 pb-3">
      <h2 class="text-sm font-bold">Mobile details</h2>
      <p class="text-xs text-muted-foreground">
        Drag from the sheet to dismiss.
      </p>
    </div>
  {/snippet}

  <div class="min-h-0 flex-1 overflow-y-auto p-4">
    <label class="grid gap-1 text-sm font-medium">
      Scene title
      <input
        class="h-10 rounded-xl border border-input bg-background px-3"
        value="Launch plan"
      />
    </label>
  </div>
</BottomSheet>
