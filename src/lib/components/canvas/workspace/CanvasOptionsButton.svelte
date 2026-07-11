<script lang="ts">
  import { Ellipsis, FileText, Link, UserPlus } from 'lucide-svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { toast } from '$lib/stores/shared/toast.svelte'
  import { roleAtLeast, type CanvasRole } from '$lib/canvas/roles'

  let {
    canvasId,
    role,
    pendingCount = 0,
    showCallSessions = true,
    onShare,
    onOpenCallSessions
  } = $props<{
    canvasId: string
    role: CanvasRole
    pendingCount?: number
    showCallSessions?: boolean
    onShare: () => void
    onOpenCallSessions: () => void
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

<Popover
  id="canvas-options-popover"
  label="Canvas options"
  role="menu"
  align="end"
  bind:open
>
  {#snippet trigger({ id, expanded })}
    <button
      type="button"
      class="toolbar-pill toolbar-button relative"
      aria-controls={id}
      aria-expanded={expanded}
      onclick={() => (open = !open)}
      aria-label={`Canvas menu${canManage && pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`}
    >
      <Ellipsis class="size-4" aria-hidden="true" />
      {#if canManage && pendingCount > 0}
        <span
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
        >
          {pendingCount}
        </span>
      {/if}
    </button>
  {/snippet}

  <div class="flex flex-col gap-1">
    {#if showCallSessions}
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-popover-foreground transition hover:bg-secondary"
        onclick={() => {
          open = false
          onOpenCallSessions()
        }}
      >
        <FileText class="size-4" />
        Call sessions
      </button>
    {/if}
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
          class="ml-auto rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning"
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
