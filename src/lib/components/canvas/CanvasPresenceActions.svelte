<script lang="ts">
  import type { CanvasRole } from '$lib/canvas/roles'
  import CanvasOptionsButton from '$lib/components/canvas/CanvasOptionsButton.svelte'
  import ConferenceCallButton from '$lib/components/canvas/conference/ConferenceCallButton.svelte'

  let { canvasId, role, members, pendingCount, onShare } = $props<{
    canvasId: string
    role: CanvasRole
    members: Array<{ id: string; name: string; color: string }>
    pendingCount: number
    onShare: () => void
  }>()
</script>

<div class="pointer-events-auto fixed right-6 top-6 z-30 flex items-center gap-3">
  <div class="flex -space-x-2">
    {#each members.slice(0, 5) as member (member.id)}
      <span
        class="flex h-9 w-9 items-center justify-center rounded-full border border-background/80 text-[11px] font-bold shadow-inner"
        style={`background-color:${member.color};color:var(--canvas-avatar-foreground)`}
        title={member.name}
      >
        {member.name.trim().slice(0, 2).toUpperCase() || 'ME'}
      </span>
    {/each}
    {#if members.length > 5}
      <span
        class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-card-foreground shadow-inner"
      >
        +{members.length - 5}
      </span>
    {/if}
  </div>

  <ConferenceCallButton />

  <CanvasOptionsButton {canvasId} {role} {pendingCount} {onShare} />
</div>
