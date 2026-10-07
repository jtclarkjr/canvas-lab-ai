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
    return 'View-only access'
  })
  const actionLabel = $derived.by(() => {
    if (isAnonymousPublicViewer) return 'Log in'
    if (status === 'denied') return isSubmitting ? 'Requesting...' : 'Retry'
    return isSubmitting ? 'Requesting...' : 'Request edit'
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
      request = response.item?.status === 'approved' ? null : response.item
    } catch {
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
  class="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40"
  data-camera-exempt
>
  <div
    class="pointer-events-auto mx-auto flex min-h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-border/70 bg-card/95 py-1.5 pl-3 pr-1.5 text-card-foreground shadow-2xl backdrop-blur"
  >
    <Eye class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

    {#if isLoading}
      <span class="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {viewingLabel}
      </span>
    {:else if status === 'pending'}
      <span
        class="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-muted-foreground"
      >
        <span
          class="size-2 shrink-0 animate-pulse rounded-full bg-warning"
          aria-hidden="true"
        ></span>
        <span class="truncate">Request pending</span>
      </span>
    {:else}
      <span class="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {status === 'denied' ? 'Request denied' : viewingLabel}
      </span>

      {#if isAnonymousPublicViewer}
        <a
          class="flex min-h-9 shrink-0 items-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition active:scale-95"
          href={loginHref}
        >
          {actionLabel}
        </a>
      {:else}
        <button
          type="button"
          class="min-h-9 shrink-0 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          disabled={isSubmitting}
          onclick={() => void submitRequest()}
        >
          {actionLabel}
        </button>
      {/if}
    {/if}
  </div>
</div>

{#if errorMessage}
  <div
    class="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-40"
    data-camera-exempt
  >
    <div
      class="mx-auto max-w-[calc(100vw-1.5rem)] rounded-2xl bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground shadow-lg"
    >
      {errorMessage}
    </div>
  </div>
{/if}
