<script lang="ts">
  import { Link, Share2, UserPlus } from 'lucide-svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { toast } from '$lib/stores/toast.svelte'
  import { roleAtLeast, type CanvasRole } from '$lib/canvas/roles'

  let {
    canvasId,
    role,
    pendingCount = 0,
    onShare
  } = $props<{
    canvasId: string
    role: CanvasRole
    pendingCount?: number
    onShare: () => void
  }>()

  let open = $state(false)

  const canManage = $derived(roleAtLeast(role, 'admin'))

  function copyLink() {
    const url = `${window.location.origin}/canvas/${canvasId}`
    void navigator.clipboard.writeText(url).then(() => {
      toast.show({
        title: 'Link copied',
        description: 'People with the link must request access.'
      })
    })
    open = false
  }
</script>

<Popover id="canvas-options-popover" label="Canvas options" role="menu" align="end" bind:open>
  {#snippet trigger({ id, expanded })}
    <button
      type="button"
      class="toolbar-pill relative flex h-9 w-9 items-center justify-center rounded-full transition hover:border-slate-700 hover:bg-slate-900"
      aria-controls={id}
      aria-expanded={expanded}
      onclick={() => (open = !open)}
      title="Share & access"
    >
      <Share2 class="size-4" />
      {#if canManage && pendingCount > 0}
        <span
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-black"
        >
          {pendingCount}
        </span>
      {/if}
    </button>
  {/snippet}

  <div class="flex flex-col gap-1">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-popover-foreground transition hover:bg-secondary"
      onclick={() => {
        open = false
        onShare()
      }}
    >
      <UserPlus class="size-4" />
      Share…
      {#if canManage && pendingCount > 0}
        <span
          class="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300"
        >
          {pendingCount} pending
        </span>
      {/if}
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-popover-foreground transition hover:bg-secondary"
      onclick={copyLink}
    >
      <Link class="size-4" />
      Copy link
    </button>
  </div>
</Popover>
