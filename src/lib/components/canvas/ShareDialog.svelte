<script lang="ts">
  import { Check, Link } from 'lucide-svelte'
  import Modal from '$lib/components/shared/Modal.svelte'
  import RoleBadge from '$lib/components/shared/RoleBadge.svelte'
  import {
    addMember,
    listMembers,
    removeMember,
    resolveAccessRequest,
    searchUsers,
    updateMemberRole
  } from '$lib/canvas/api'
  import type { AccessRequest, CanvasMember, UserSearchResult } from '$lib/canvas/schema'
  import {
    MEMBER_ROLES,
    ROLE_LABELS,
    roleAtLeast,
    type CanvasRole,
    type MemberRole
  } from '$lib/canvas/roles'
  import { toast } from '$lib/stores/toast.svelte'

  let {
    open = $bindable(false),
    canvasId,
    canvasTitle = '',
    role,
    currentUserId,
    pendingRequests = [],
    onRequestResolved
  } = $props<{
    open?: boolean
    canvasId: string
    canvasTitle?: string
    role: CanvasRole
    currentUserId: string
    pendingRequests?: AccessRequest[]
    onRequestResolved?: (requestId: string) => void
  }>()

  const canManage = $derived(roleAtLeast(role, 'admin'))
  const shareUrl = $derived(
    typeof window !== 'undefined' ? `${window.location.origin}/canvas/${canvasId}` : ''
  )

  let members = $state<CanvasMember[]>([])
  let isLoadingMembers = $state(false)
  let searchQuery = $state('')
  let searchResults = $state<UserSearchResult[]>([])
  let isSearching = $state(false)
  let addRole = $state<MemberRole>('reader')
  let approveRoles = $state<Record<string, MemberRole>>({})
  let busyIds = $state<Set<string>>(new Set())
  let errorMessage = $state<string | null>(null)
  let copied = $state(false)

  function setBusy(id: string, busy: boolean) {
    const next = new Set(busyIds)
    if (busy) {
      next.add(id)
    } else {
      next.delete(id)
    }
    busyIds = next
  }

  function reportError(error: unknown, fallback: string) {
    errorMessage = error instanceof Error ? error.message : fallback
  }

  async function loadMembers() {
    if (!canManage) return
    isLoadingMembers = true
    try {
      const response = await listMembers(canvasId)
      members = response.items
    } catch (error) {
      reportError(error, 'Failed to load members.')
    } finally {
      isLoadingMembers = false
    }
  }

  function copyLink() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      copied = true
      setTimeout(() => (copied = false), 2000)
    })
  }

  async function handleAdd(result: UserSearchResult) {
    setBusy(result.id, true)
    errorMessage = null
    try {
      await addMember(canvasId, { userId: result.id, role: addRole })
      searchResults = searchResults.filter((entry) => entry.id !== result.id)
      await loadMembers()
      toast.show({
        title: 'Member added',
        description: `${result.displayName ?? result.email} can now access this canvas.`
      })
    } catch (error) {
      reportError(error, 'Failed to add member.')
    } finally {
      setBusy(result.id, false)
    }
  }

  async function handleRoleChange(member: CanvasMember, nextRole: MemberRole) {
    setBusy(member.userId, true)
    errorMessage = null
    try {
      await updateMemberRole(canvasId, member.userId, nextRole)
      members = members.map((entry) =>
        entry.userId === member.userId ? { ...entry, role: nextRole } : entry
      )
    } catch (error) {
      reportError(error, 'Failed to update member role.')
    } finally {
      setBusy(member.userId, false)
    }
  }

  async function handleRemove(member: CanvasMember) {
    setBusy(member.userId, true)
    errorMessage = null
    try {
      await removeMember(canvasId, member.userId)
      members = members.filter((entry) => entry.userId !== member.userId)
    } catch (error) {
      reportError(error, 'Failed to remove member.')
    } finally {
      setBusy(member.userId, false)
    }
  }

  async function handleResolve(request: AccessRequest, action: 'approve' | 'deny') {
    setBusy(request.id, true)
    errorMessage = null
    try {
      await resolveAccessRequest(
        canvasId,
        request.id,
        action === 'approve' ? { action, role: approveRoles[request.id] ?? 'reader' } : { action }
      )
      onRequestResolved?.(request.id)
      if (action === 'approve') {
        await loadMembers()
      }
    } catch (error) {
      reportError(error, 'Failed to resolve request.')
    } finally {
      setBusy(request.id, false)
    }
  }

  function memberLabel(entry: { displayName: string | null; email: string }) {
    return entry.displayName || entry.email || 'Unknown user'
  }

  $effect(() => {
    if (open) {
      errorMessage = null
      searchQuery = ''
      searchResults = []
      void loadMembers()
    }
  })

  $effect(() => {
    const query = searchQuery.trim()
    if (!canManage || query.length < 2) {
      searchResults = []
      isSearching = false
      return
    }

    isSearching = true
    const timeout = setTimeout(async () => {
      try {
        const response = await searchUsers(query)
        const memberIds = new Set(members.map((entry) => entry.userId))
        searchResults = response.items.filter((entry) => !memberIds.has(entry.id))
      } catch (error) {
        reportError(error, 'Failed to search users.')
      } finally {
        isSearching = false
      }
    }, 300)

    return () => clearTimeout(timeout)
  })
</script>

<Modal
  bind:open
  title={canvasTitle ? `Share "${canvasTitle}"` : 'Share canvas'}
  eyebrow="Access"
  widthClass="max-w-xl"
>
  <div class="grid gap-6">
    <section class="grid gap-2">
      <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Share link
      </h3>
      <div class="flex items-center gap-2">
        <input
          class="min-w-0 flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none"
          readonly
          value={shareUrl}
          onfocus={(event) => (event.currentTarget as HTMLInputElement).select()}
        />
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          onclick={copyLink}
        >
          {#if copied}
            <Check class="size-4" /> Copied
          {:else}
            <Link class="size-4" /> Copy
          {/if}
        </button>
      </div>
      <p class="text-xs text-muted-foreground">
        Anyone with the link must request access before they can view this canvas.
      </p>
    </section>

    {#if canManage}
      <section class="grid gap-2">
        <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Add people
        </h3>
        <div class="flex items-center gap-2">
          <input
            class="min-w-0 flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Search by name or email"
            bind:value={searchQuery}
          />
          <select
            class="shrink-0 rounded-xl border border-border bg-secondary/40 px-2 py-2 text-sm text-foreground outline-none"
            bind:value={addRole}
            aria-label="Role for new members"
          >
            {#each MEMBER_ROLES as memberRole}
              <option value={memberRole}>{ROLE_LABELS[memberRole]}</option>
            {/each}
          </select>
        </div>

        {#if isSearching}
          <p class="text-xs text-muted-foreground">Searching…</p>
        {:else if searchResults.length > 0}
          <ul class="grid gap-1">
            {#each searchResults as result (result.id)}
              <li
                class="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-secondary/40"
              >
                {#if result.avatarUrl}
                  <img src={result.avatarUrl} alt="" class="size-8 rounded-full" />
                {:else}
                  <span
                    class="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
                  >
                    {memberLabel(result).slice(0, 2).toUpperCase()}
                  </span>
                {/if}
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">{memberLabel(result)}</p>
                  <p class="truncate text-xs text-muted-foreground">{result.email}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  disabled={busyIds.has(result.id)}
                  onclick={() => void handleAdd(result)}
                >
                  Add
                </button>
              </li>
            {/each}
          </ul>
        {:else if searchQuery.trim().length >= 2}
          <p class="text-xs text-muted-foreground">No users found.</p>
        {/if}
      </section>

      {#if pendingRequests.length > 0}
        <section class="grid gap-2">
          <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">
            Pending requests
          </h3>
          <ul class="grid gap-1">
            {#each pendingRequests as request (request.id)}
              <li
                class="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-2 py-1.5"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">
                    {request.requester ? memberLabel(request.requester) : 'Unknown user'}
                  </p>
                  {#if request.requester?.email}
                    <p class="truncate text-xs text-muted-foreground">{request.requester.email}</p>
                  {/if}
                </div>
                <select
                  class="shrink-0 rounded-xl border border-border bg-secondary/40 px-2 py-1.5 text-xs text-foreground outline-none"
                  value={approveRoles[request.id] ?? 'reader'}
                  aria-label="Role to grant"
                  onchange={(event) => {
                    approveRoles = {
                      ...approveRoles,
                      [request.id]: (event.currentTarget as HTMLSelectElement).value as MemberRole
                    }
                  }}
                >
                  {#each MEMBER_ROLES as memberRole}
                    <option value={memberRole}>{ROLE_LABELS[memberRole]}</option>
                  {/each}
                </select>
                <button
                  type="button"
                  class="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  disabled={busyIds.has(request.id)}
                  onclick={() => void handleResolve(request, 'approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  class="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition hover:opacity-90 disabled:opacity-50"
                  disabled={busyIds.has(request.id)}
                  onclick={() => void handleResolve(request, 'deny')}
                >
                  Deny
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <section class="grid gap-2">
        <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          People with access
        </h3>
        {#if isLoadingMembers}
          <p class="text-xs text-muted-foreground">Loading members…</p>
        {:else}
          <ul class="grid gap-1">
            {#each members as member (member.userId)}
              <li
                class="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-secondary/40"
              >
                {#if member.avatarUrl}
                  <img src={member.avatarUrl} alt="" class="size-8 rounded-full" />
                {:else}
                  <span
                    class="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
                  >
                    {memberLabel(member).slice(0, 2).toUpperCase()}
                  </span>
                {/if}
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-foreground">
                    {memberLabel(member)}
                    {#if member.userId === currentUserId}
                      <span class="text-xs text-muted-foreground">(you)</span>
                    {/if}
                  </p>
                  <p class="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                {#if member.role === 'owner'}
                  <RoleBadge role="owner" />
                {:else}
                  <select
                    class="shrink-0 rounded-xl border border-border bg-secondary/40 px-2 py-1.5 text-xs text-foreground outline-none disabled:opacity-50"
                    value={member.role}
                    disabled={busyIds.has(member.userId)}
                    aria-label={`Role for ${memberLabel(member)}`}
                    onchange={(event) =>
                      void handleRoleChange(
                        member,
                        (event.currentTarget as HTMLSelectElement).value as MemberRole
                      )}
                  >
                    {#each MEMBER_ROLES as memberRole}
                      <option value={memberRole}>{ROLE_LABELS[memberRole]}</option>
                    {/each}
                  </select>
                  <button
                    type="button"
                    class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:text-destructive disabled:opacity-50"
                    disabled={busyIds.has(member.userId)}
                    onclick={() => void handleRemove(member)}
                    aria-label={`Remove ${memberLabel(member)}`}
                  >
                    Remove
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#if errorMessage}
      <p class="text-sm text-destructive">{errorMessage}</p>
    {/if}
  </div>
</Modal>
