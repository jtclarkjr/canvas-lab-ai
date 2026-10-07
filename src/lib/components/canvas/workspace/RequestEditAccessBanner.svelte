<script lang="ts">
  import { refreshAll } from '$app/navigation'
  import { Eye } from 'lucide-svelte'
  import { untrack } from 'svelte'
  import {
    supabase,
    ensureSessionInitialized
  } from '#lib/auth/session-store.js'
  import { getMyAccessRequest, requestAccess } from '#lib/canvas/api.js'
  import type { AccessRequest } from '#lib/canvas/schema.js'
  import { roleAtLeast, type CanvasRole } from '#lib/canvas/roles.js'
  import { toast } from '#lib/stores/shared/toast.svelte.js'

  let {
    canvasId,
    isPublicViewer = false,
    isAnonymousPublicViewer = false
  } = $props<{
    canvasId: string
    isPublicViewer?: boolean
    isAnonymousPublicViewer?: boolean
  }>()

  let request = $state<AccessRequest | null>(null)
  let isLoading = $state(true)
  let isSubmitting = $state(false)
  let errorMessage = $state<string | null>(null)
  let reloadRequested = false

  const status = $derived(request?.status ?? 'idle')
  const viewingLabel = $derived.by(() => {
    if (isAnonymousPublicViewer) return 'Limited view only'
    if (isPublicViewer) return 'Viewing public canvas'
    return 'You have view-only access'
  })
  const loginHref = $derived(
    `/login?redirect=${encodeURIComponent(`/canvas/${canvasId}`)}`
  )

  async function loadMyRequest() {
    if (isAnonymousPublicViewer) {
      request = null
      isLoading = false
      return
    }

    isLoading = true
    try {
      const response = await getMyAccessRequest(canvasId)
      // An approved request while still stuck at view-only is consumed (it
      // granted reader, or the role was reduced since) — offer a fresh one.
      request = response.item?.status === 'approved' ? null : response.item
    } catch {
      // Non-fatal: the banner just starts from the idle state.
      request = null
    } finally {
      isLoading = false
    }
  }

  async function submitRequest() {
    if (isAnonymousPublicViewer) {
      window.location.assign(loginHref)
      return
    }

    isSubmitting = true
    errorMessage = null
    try {
      const response = await requestAccess(canvasId, 'editor')
      request = response.item
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to request edit access.'
    } finally {
      isSubmitting = false
    }
  }

  $effect(() => {
    void canvasId
    void isAnonymousPublicViewer
    untrack(() => {
      void loadMyRequest()
    })
  })

  $effect(() => {
    const client = supabase
    const requestId = request?.id
    const requestStatus = request?.status
    if (
      !client ||
      isAnonymousPublicViewer ||
      !requestId ||
      requestStatus !== 'pending'
    ) {
      return
    }

    return untrack(() => {
      let cancelled = false

      const channel = client.channel(`canvas:${canvasId}:my-edit-request`).on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_access_requests',
          filter: `id=eq.${requestId}`
        },
        (payload) => {
          const next = payload.new as {
            status?: string
            requested_role?: CanvasRole | null
            resolved_role?: CanvasRole | null
          }
          if (next.status === 'approved' && !reloadRequested) {
            reloadRequested = true
            // The admin may approve with a lower role than requested
            // (e.g. an editor request granted as reader) — say so instead
            // of promising edit access.
            const requested = next.requested_role ?? 'reader'
            const granted = next.resolved_role ?? 'reader'
            if (roleAtLeast(granted, 'editor')) {
              toast.show({
                title: 'Access granted',
                description: 'You can now edit this canvas.'
              })
            } else if (roleAtLeast(requested, 'editor')) {
              toast.show({
                title: 'View access granted',
                description:
                  "Your edit request wasn't approved, but you have view access."
              })
            } else {
              toast.show({
                title: 'Access granted',
                description: 'Your access request was approved.'
              })
            }
            void refreshAll()
          } else if (next.status === 'denied' && request) {
            request = { ...request, status: 'denied' }
          }
        }
      )

      // The RLS policy on canvas_access_requests requires the realtime socket
      // to carry this user's JWT before the subscription is authorized.
      void ensureSessionInitialized().then((session) => {
        if (cancelled) return
        if (session?.access_token) {
          client.realtime.setAuth(session.access_token)
        }
        channel.subscribe()
      })

      return () => {
        cancelled = true
        void client.removeChannel(channel)
      }
    })
  })
</script>

<div
  class="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-background/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur"
>
  <Eye class="size-4 shrink-0 text-muted-foreground" />
  {#if isLoading}
    <span class="text-sm text-muted-foreground">{viewingLabel}</span>
  {:else if isAnonymousPublicViewer}
    <span class="text-sm text-muted-foreground">{viewingLabel}</span>
    <a
      class="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
      href={loginHref}
    >
      Log in
    </a>
  {:else if status === 'pending'}
    <span class="flex items-center gap-2 pr-2 text-sm text-muted-foreground">
      <span
        class="size-2 animate-pulse rounded-full bg-warning"
        aria-hidden="true"
      ></span>
      Edit access requested — waiting for approval
    </span>
  {:else if status === 'denied'}
    <span class="text-sm text-muted-foreground">Edit request denied</span>
    <button
      type="button"
      class="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      disabled={isSubmitting}
      onclick={() => void submitRequest()}
    >
      {isSubmitting ? 'Requesting…' : 'Request again'}
    </button>
  {:else}
    <span class="text-sm text-muted-foreground">{viewingLabel}</span>
    <button
      type="button"
      class="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      disabled={isSubmitting}
      onclick={() => void submitRequest()}
    >
      {isSubmitting ? 'Requesting…' : 'Request edit access'}
    </button>
  {/if}
</div>

{#if errorMessage}
  <div
    class="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg"
  >
    {errorMessage}
  </div>
{/if}
