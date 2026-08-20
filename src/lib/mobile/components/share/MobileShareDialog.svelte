<script lang="ts">
  import { Check, Link, X } from 'lucide-svelte'
  import {
    addMember,
    listMembers,
    removeMember,
    resolveAccessRequest,
    searchUsers,
    updateMemberRole
  } from '$lib/workspace/api'
  import type {
    AccessRequest,
    CanvasVisibility,
    UserSearchResult
  } from '$lib/canvas/schema'
  import type { CanvasMember } from '$lib/workspace/schema'
  import { MEMBER_ROLES, ROLE_LABELS } from '$lib/canvas/consts'
  import { roleAtLeast } from '$lib/canvas/roles'
  import type { CanvasRole, MemberRole } from '$lib/canvas/roles'
  import { toast } from '$lib/stores/shared/toast.svelte'
  import { Dialog } from '$lib/components/ui'

  let {
    open = $bindable(false),
    canvasId,
    canvasTitle = '',
    role,
    currentUserId,
    visibility = 'private',
    pendingRequests = [],
    onRequestResolved,
    onVisibilityChange
  } = $props<{
    open?: boolean
    canvasId: string
    canvasTitle?: string
    role: CanvasRole
    currentUserId: string
    visibility?: CanvasVisibility
    pendingRequests?: AccessRequest[]
    onRequestResolved?: (requestId: string) => void
    onVisibilityChange?: (visibility: CanvasVisibility) => Promise<void> | void
  }>()

  const canManage = $derived(roleAtLeast(role, 'admin'))
  const shareUrl = $derived(
    typeof window !== 'undefined'
      ? `${window.location.origin}/canvas/${canvasId}`
      : ''
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
  let visibilityOverride = $state<CanvasVisibility | null>(null)
  let visibilityBusy = $state(false)
  const effectiveVisibility = $derived(visibilityOverride ?? visibility)

  function close() {
    open = false
  }

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

  function memberLabel(entry: { displayName: string | null; email: string }) {
    return entry.displayName || entry.email || 'Unknown user'
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

  async function handleVisibilityToggle() {
    if (visibilityBusy || !canManage) return
    const next: CanvasVisibility =
      effectiveVisibility === 'public' ? 'private' : 'public'
    visibilityOverride = next
    visibilityBusy = true
    errorMessage = null
    try {
      await onVisibilityChange?.(next)
    } catch (error) {
      reportError(error, 'Failed to update canvas visibility.')
    } finally {
      visibilityOverride = null
      visibilityBusy = false
    }
  }

  async function handleAdd(result: UserSearchResult) {
    setBusy(result.id, true)
    errorMessage = null
    try {
      await addMember(canvasId, { userId: result.id, role: addRole })
      searchQuery = ''
      searchResults = []
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

  async function handleResolve(
    request: AccessRequest,
    action: 'approve' | 'deny'
  ) {
    setBusy(request.id, true)
    errorMessage = null
    try {
      await resolveAccessRequest(
        canvasId,
        request.id,
        action === 'approve'
          ? {
              action,
              role:
                approveRoles[request.id] ?? request.requestedRole ?? 'reader'
            }
          : { action }
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
        searchResults = response.items.filter(
          (entry) => !memberIds.has(entry.id)
        )
      } catch (error) {
        reportError(error, 'Failed to search users.')
      } finally {
        isSearching = false
      }
    }, 300)

    return () => clearTimeout(timeout)
  })
</script>

{#if open}
  <Dialog
    bind:open
    onOpenChange={(nextOpen) => {
      if (!nextOpen) close()
    }}
    title="Share"
    description={canvasTitle || 'Canvas'}
    widthClass="max-w-none"
    class="inset-x-3 bottom-3 top-[calc(env(safe-area-inset-top)+0.75rem)] left-3 m-0 flex h-auto max-h-none w-auto translate-x-0 translate-y-0 flex-col overflow-hidden rounded-2xl border-border/70 bg-card p-0 text-card-foreground"
    hideHeader
  >
    <div
      class="flex shrink-0 items-start gap-3 border-b border-border/60 px-4 py-4"
    >
      <div class="min-w-0 flex-1">
        <p
          class="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground"
        >
          Access
        </p>
        <h2 id="mobile-share-title" class="truncate text-xl font-bold">
          Share
        </h2>
        <p class="mt-0.5 truncate text-sm font-semibold text-muted-foreground">
          {canvasTitle || 'Canvas'}
        </p>
      </div>
      <button
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        onclick={close}
        aria-label="Close share dialog"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div class="grid gap-5">
        <section class="grid gap-2">
          <h3
            class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Share link
          </h3>
          <input
            class="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none"
            readonly
            value={shareUrl}
            aria-label="Share URL"
            onfocus={(event) =>
              (event.currentTarget as HTMLInputElement).select()}
          />
          <button
            type="button"
            class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
            onclick={copyLink}
          >
            {#if copied}
              <Check class="size-4" aria-hidden="true" /> Copied
            {:else}
              <Link class="size-4" aria-hidden="true" /> Copy link
            {/if}
          </button>
          <p class="text-xs leading-relaxed text-muted-foreground">
            {#if effectiveVisibility === 'public'}
              Anyone signed in with the link can view this canvas.
            {:else}
              Anyone with the link must request access before they can view this
              canvas.
            {/if}
          </p>
        </section>

        {#if canManage}
          <section class="grid gap-2">
            <h3
              class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              General access
            </h3>
            <div
              class="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium">
                  {effectiveVisibility === 'public' ? 'Public' : 'Private'}
                </p>
                <p class="text-xs leading-relaxed text-muted-foreground">
                  {#if effectiveVisibility === 'public'}
                    Anyone signed in can view. Viewers can request edit access.
                  {:else}
                    Only invited people can access this canvas.
                  {/if}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={effectiveVisibility === 'public'}
                aria-label="Make canvas public"
                disabled={visibilityBusy}
                class={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                  effectiveVisibility === 'public'
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                }`}
                onclick={() => void handleVisibilityToggle()}
              >
                <span
                  class={`absolute top-0.5 size-6 rounded-full bg-background shadow transition-all ${
                    effectiveVisibility === 'public'
                      ? 'left-[22px]'
                      : 'left-0.5'
                  }`}
                ></span>
              </button>
            </div>
          </section>

          <section class="grid gap-2">
            <h3
              class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Add people
            </h3>
            <div class="grid gap-2">
              <input
                class="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Search by name or email"
                aria-label="Search people by name or email"
                bind:value={searchQuery}
              />
              <select
                class="h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none"
                bind:value={addRole}
                aria-label="Role for new members"
              >
                {#each MEMBER_ROLES as memberRole}
                  <option value={memberRole}>{ROLE_LABELS[memberRole]}</option>
                {/each}
              </select>
            </div>

            {#if isSearching}
              <p class="text-xs text-muted-foreground">Searching...</p>
            {:else if searchResults.length > 0}
              <ul class="grid gap-2">
                {#each searchResults as result (result.id)}
                  <li class="rounded-xl bg-secondary/30 p-3">
                    <div class="flex items-center gap-3">
                      {#if result.avatarUrl}
                        <img
                          src={result.avatarUrl}
                          alt=""
                          class="size-9 rounded-full"
                        />
                      {:else}
                        <span
                          class="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
                        >
                          {memberLabel(result).slice(0, 2).toUpperCase()}
                        </span>
                      {/if}
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium">
                          {memberLabel(result)}
                        </p>
                        <p class="truncate text-xs text-muted-foreground">
                          {result.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="mt-3 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                      disabled={busyIds.has(result.id)}
                      onclick={() => void handleAdd(result)}
                    >
                      Add as {ROLE_LABELS[addRole]}
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
              <h3
                class="text-xs font-bold uppercase tracking-[0.18em] text-warning"
              >
                Pending requests
              </h3>
              <ul class="grid gap-2">
                {#each pendingRequests as request (request.id)}
                  <li
                    class="grid gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium">
                        {request.requester
                          ? memberLabel(request.requester)
                          : 'Unknown user'}
                      </p>
                      {#if request.requester?.email}
                        <p class="truncate text-xs text-muted-foreground">
                          {request.requester.email}
                        </p>
                      {/if}
                    </div>
                    <select
                      class="h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none"
                      value={approveRoles[request.id] ??
                        request.requestedRole ??
                        'reader'}
                      aria-label="Role to grant"
                      onchange={(event) => {
                        approveRoles = {
                          ...approveRoles,
                          [request.id]: (
                            event.currentTarget as HTMLSelectElement
                          ).value as MemberRole
                        }
                      }}
                    >
                      {#each MEMBER_ROLES as memberRole}
                        <option value={memberRole}
                          >{ROLE_LABELS[memberRole]}</option
                        >
                      {/each}
                    </select>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        class="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        disabled={busyIds.has(request.id)}
                        onclick={() => void handleResolve(request, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        class="h-10 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground disabled:opacity-50"
                        disabled={busyIds.has(request.id)}
                        onclick={() => void handleResolve(request, 'deny')}
                      >
                        Deny
                      </button>
                    </div>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}

          <section class="grid gap-2">
            <h3
              class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              People with access
            </h3>
            {#if isLoadingMembers}
              <div class="grid gap-2">
                {#each Array.from({ length: 2 }) as _, index (index)}
                  <div class="flex items-center gap-3 rounded-xl p-2">
                    <span
                      class="size-9 shrink-0 animate-pulse rounded-full bg-muted-foreground/25"
                    ></span>
                    <div class="grid min-w-0 flex-1 gap-1.5">
                      <span
                        class="h-3 w-28 animate-pulse rounded bg-muted-foreground/25"
                      ></span>
                      <span
                        class="h-2.5 w-40 animate-pulse rounded bg-muted-foreground/20"
                      ></span>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <ul class="grid gap-2">
                {#each members as member (member.userId)}
                  <li class="rounded-xl bg-secondary/25 p-3">
                    <div class="flex items-center gap-3">
                      {#if member.avatarUrl}
                        <img
                          src={member.avatarUrl}
                          alt=""
                          class="size-9 rounded-full"
                        />
                      {:else}
                        <span
                          class="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
                        >
                          {memberLabel(member).slice(0, 2).toUpperCase()}
                        </span>
                      {/if}
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium">
                          {memberLabel(member)}
                          {#if member.userId === currentUserId}
                            <span class="text-xs text-muted-foreground">
                              (you)
                            </span>
                          {/if}
                        </p>
                        <p class="truncate text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      <span
                        class="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary"
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>

                    {#if member.role !== 'owner'}
                      <div class="mt-3 grid grid-cols-[1fr_auto] gap-2">
                        <select
                          class="h-10 min-w-0 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none disabled:opacity-50"
                          value={member.role}
                          disabled={busyIds.has(member.userId)}
                          aria-label={`Role for ${memberLabel(member)}`}
                          onchange={(event) =>
                            void handleRoleChange(
                              member,
                              (event.currentTarget as HTMLSelectElement)
                                .value as MemberRole
                            )}
                        >
                          {#each MEMBER_ROLES as memberRole}
                            <option value={memberRole}
                              >{ROLE_LABELS[memberRole]}</option
                            >
                          {/each}
                        </select>
                        <button
                          type="button"
                          class="h-10 rounded-xl px-3 text-sm font-semibold text-destructive disabled:opacity-50"
                          disabled={busyIds.has(member.userId)}
                          onclick={() => void handleRemove(member)}
                          aria-label={`Remove ${memberLabel(member)}`}
                        >
                          Remove
                        </button>
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/if}

        {#if errorMessage}
          <p class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        {/if}
      </div>
    </div>
  </Dialog>
{/if}
