<script lang="ts">
  import { UserRound } from 'lucide-svelte'
  import type { CanvasRole } from '$lib/canvas/roles'
  import CanvasOptionsButton from '$lib/components/canvas/workspace/CanvasOptionsButton.svelte'
  import ConferenceCallButton from '$lib/components/canvas/conference/controls/ConferenceCallButton.svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { getWorkspaceAvatarInitials } from '$lib/workspace/presence-identity'
  import type { DisplayMember } from '$lib/workspace/types'

  let { canvasId, role, members, pendingCount, onShare } = $props<{
    canvasId: string
    role: CanvasRole
    members: DisplayMember[]
    pendingCount: number
    onShare: () => void
  }>()

  let membersOpen = $state(false)
</script>

<div
  class="pointer-events-auto fixed right-6 top-6 z-30 flex items-center gap-3"
>
  <Popover
    id="canvas-members-popover"
    label="Active members"
    align="end"
    bind:open={membersOpen}
  >
    {#snippet trigger({ id, expanded })}
      <button
        type="button"
        class="flex -space-x-2 cursor-pointer"
        aria-controls={id}
        aria-expanded={expanded}
        onclick={() => (membersOpen = !membersOpen)}
        aria-label={`${members.length} active member${members.length !== 1 ? 's' : ''} — view list`}
      >
        {#each members.slice(0, 5) as member (member.id)}
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full border border-background/80 text-[11px] font-bold shadow-inner"
            style={`background-color:${member.color};color:var(--canvas-avatar-foreground)`}
            aria-hidden="true"
          >
            {#if member.isAnonymous}
              <UserRound class="size-4" aria-label="Guest viewer" />
            {:else}
              {getWorkspaceAvatarInitials(member.name)}
            {/if}
          </span>
        {/each}
        {#if members.length > 5}
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-card-foreground shadow-inner"
            aria-hidden="true"
          >
            +{members.length - 5}
          </span>
        {/if}
      </button>
    {/snippet}

    <div class="flex flex-col gap-0.5 p-1">
      <p
        class="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {members.length} active
      </p>
      {#each members as member (member.id)}
        <div class="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={`background-color:${member.color};color:var(--canvas-avatar-foreground)`}
          >
            {#if member.isAnonymous}
              <UserRound class="size-3.5" aria-label="Guest viewer" />
            {:else}
              {getWorkspaceAvatarInitials(member.name)}
            {/if}
          </span>
          <span class="truncate text-sm text-popover-foreground">
            {member.isAnonymous ? 'Guest viewer' : member.name}
          </span>
        </div>
      {/each}
    </div>
  </Popover>

  <ConferenceCallButton />

  <CanvasOptionsButton {canvasId} {role} {pendingCount} {onShare} />
</div>
