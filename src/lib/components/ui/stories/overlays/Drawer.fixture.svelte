<script lang="ts">
  import { RefreshCw } from 'lucide-svelte'
  import Button from '../../actions/Button.svelte'
  import IconButton from '../../actions/IconButton.svelte'
  import Drawer from '../../overlays/Drawer.svelte'

  let { initialOpen = false, widthClass = undefined } = $props<{
    initialOpen?: boolean
    widthClass?: string
  }>()

  let open = $state(false)
  $effect(() => {
    open = initialOpen
  })
</script>

<div class="flex min-h-48 items-center justify-center p-6">
  <Button onclick={() => (open = true)}>Open activity drawer</Button>
</div>

<Drawer
  bind:open
  title="Canvas activity"
  description="Recent changes from collaborators"
  closeLabel="Close activity drawer"
  {widthClass}
>
  {#snippet headerActions()}
    <IconButton label="Refresh activity" variant="ghost" class="size-9">
      <RefreshCw class="size-4" aria-hidden="true" />
    </IconButton>
  {/snippet}

  <div class="space-y-3 overflow-y-auto p-4">
    <button class="w-full rounded-xl border border-border/70 p-3 text-left">
      <span class="block text-sm font-semibold">Scene title updated</span>
      <span class="text-xs text-muted-foreground">Alex · 2 minutes ago</span>
    </button>
    <button class="w-full rounded-xl border border-border/70 p-3 text-left">
      <span class="block text-sm font-semibold">Workflow node added</span>
      <span class="text-xs text-muted-foreground">Mina · 8 minutes ago</span>
    </button>
  </div>
</Drawer>
