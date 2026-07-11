<script lang="ts">
  import { MousePointer2, UserRound } from 'lucide-svelte'
  import { roleAtLeast, type CanvasRole } from '$lib/canvas/roles'
  import CanvasHistoryButton from '$lib/components/canvas/workspace/CanvasHistoryButton.svelte'
  import CanvasOptionsButton from '$lib/components/canvas/workspace/CanvasOptionsButton.svelte'
  import ConferenceCallButton from '$lib/components/canvas/conference/controls/ConferenceCallButton.svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { getWorkspaceAvatarInitials } from '$lib/workspace/presence-identity'
  import type { DisplayMember } from '$lib/workspace/types'

  let {
    canvasId,
    role,
    members,
    currentUserId,
    followedUserId,
    pendingCount,
    showCallSessions = true,
    onShare,
    onOpenCallSessions,
    onFollowMember
  } = $props<{
    canvasId: string
    role: CanvasRole
    members: DisplayMember[]
    currentUserId: string
    followedUserId: string | null
    pendingCount: number
    showCallSessions?: boolean
    onShare: () => void
    onOpenCallSessions: () => void
    onFollowMember: (memberId: string | null) => void
  }>()

  let membersOpen = $state(false)

  function memberName(member: DisplayMember) {
    return member.isAnonymous ? 'Guest viewer' : member.name
  }

  function getTriggerAvatarClass(member: DisplayMember) {
    const base =
      'flex h-9 w-9 items-center justify-center rounded-full border border-background/80 text-[11px] font-bold shadow-inner'

    return member.id === followedUserId
      ? `${base} ring-2 ring-primary ring-offset-2 ring-offset-background`
      : base
  }

  function getMemberRowClass(member: DisplayMember) {
    const base =
      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition'

    if (member.id === currentUserId) {
      return `${base} cursor-default`
    }

    if (member.id === followedUserId) {
      return `${base} bg-primary/10 text-popover-foreground ring-1 ring-primary/40`
    }

    return `${base} hover:bg-secondary`
  }

  function toggleMemberFollow(member: DisplayMember) {
    onFollowMember(member.id === followedUserId ? null : member.id)
  }
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
            class={getTriggerAvatarClass(member)}
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
        {@const isSelf = member.id === currentUserId}
        {@const isFollowing = member.id === followedUserId}
        {#if isSelf}
          <div class={getMemberRowClass(member)}>
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
              {memberName(member)}
            </span>
          </div>
        {:else}
          <button
            type="button"
            class={getMemberRowClass(member)}
            aria-pressed={isFollowing}
            aria-label={isFollowing
              ? `Stop following ${memberName(member)}`
              : `Follow ${memberName(member)} live cursor`}
            onclick={() => toggleMemberFollow(member)}
          >
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
            <span
              class="min-w-0 flex-1 truncate text-sm text-popover-foreground"
            >
              {memberName(member)}
            </span>
            <MousePointer2
              class={`size-4 shrink-0 ${isFollowing ? 'text-primary' : 'text-muted-foreground opacity-45'}`}
              aria-hidden="true"
            />
          </button>
        {/if}
      {/each}
    </div>
  </Popover>

  <ConferenceCallButton />

  {#if roleAtLeast(role, 'admin')}
    <CanvasHistoryButton {canvasId} />
  {/if}

  <CanvasOptionsButton
    {canvasId}
    {role}
    {pendingCount}
    {showCallSessions}
    {onShare}
    {onOpenCallSessions}
  />
</div>
