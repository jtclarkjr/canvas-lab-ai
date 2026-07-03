<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import { Lock } from 'lucide-svelte'
  import { untrack } from 'svelte'
  import { supabase, ensureSessionInitialized } from '$lib/auth/session-store'
  import { getCanvas, getMyAccessRequest, requestAccess } from '$lib/canvas/api'
  import type { AccessRequest } from '$lib/canvas/schema'

  let { canvasId } = $props<{ canvasId: string }>()

  let request = $state<AccessRequest | null>(null)
  let isLoading = $state(true)
  let isSubmitting = $state(false)
  let errorMessage = $state<string | null>(null)
  // The snapshot path may re-run the page load at most once; recursing here
  // would loop the screen since the load already answered "no access".
  let reloadRequested = false

  const status = $derived(request?.status ?? 'idle')

  async function loadMyRequest() {
    isLoading = true
    try {
      const response = await getMyAccessRequest(canvasId)

      if (response.item?.status === 'approved') {
        // The page load said "no access", so an approved request is stale
        // (approved earlier, access revoked since) unless approval landed in
        // the last instant. Verify before reloading so a revoked user can
        // request again instead of refresh-looping.
        const hasAccess = await getCanvas(canvasId)
          .then(() => true)
          .catch(() => false)

        if (hasAccess && !reloadRequested) {
          reloadRequested = true
          void invalidateAll()
          return
        }

        request = null
        return
      }

      request = response.item
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load access request.'
    } finally {
      isLoading = false
    }
  }

  async function submitRequest() {
    isSubmitting = true
    errorMessage = null
    try {
      const response = await requestAccess(canvasId)
      request = response.item
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : 'Failed to request access.'
    } finally {
      isSubmitting = false
    }
  }

  $effect(() => {
    void canvasId
    untrack(() => {
      void loadMyRequest()
    })
  })

  $effect(() => {
    const client = supabase
    const requestId = request?.id
    const requestStatus = request?.status
    if (!client || !requestId || requestStatus !== 'pending') {
      return
    }

    return untrack(() => {
      let cancelled = false

      const channel = client.channel(`canvas:${canvasId}:my-access`).on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_access_requests',
          filter: `id=eq.${requestId}`
        },
        (payload) => {
          const next = payload.new as { status?: string }
          if (next.status === 'approved') {
            void invalidateAll()
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

  // This screen only renders while the canvas is private; if it flips to
  // public, re-run the page load so the visitor enters as a public viewer.
  $effect(() => {
    const client = supabase
    if (!client || !canvasId) {
      return
    }

    return untrack(() => {
      let cancelled = false

      const channel = client.channel(`canvas:${canvasId}:visibility-watch`).on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvases',
          filter: `id=eq.${canvasId}`
        },
        (payload) => {
          const next = payload.new as { visibility?: string }
          if (next.visibility === 'public' && !reloadRequested) {
            reloadRequested = true
            void invalidateAll()
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
  class="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-6"
>
  <div
    class="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
  >
    <Lock class="size-6" />
  </div>

  {#if isLoading}
    <p class="text-sm text-muted-foreground">Checking access…</p>
  {:else if status === 'pending'}
    <h1 class="text-2xl font-bold text-foreground">Request sent</h1>
    <p class="max-w-sm text-center text-sm text-muted-foreground">
      The owner has been notified. You'll get in automatically as soon as your
      request is approved — keep this page open.
    </p>
    <span
      class="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground"
    >
      <span class="size-2 animate-pulse rounded-full bg-warning"></span>
      Waiting for approval
    </span>
  {:else if status === 'denied'}
    <h1 class="text-2xl font-bold text-foreground">Request denied</h1>
    <p class="max-w-sm text-center text-sm text-muted-foreground">
      Your previous request was denied. You can send a new request if you think
      this was a mistake.
    </p>
    <button
      type="button"
      class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      disabled={isSubmitting}
      onclick={() => void submitRequest()}
    >
      {isSubmitting ? 'Requesting…' : 'Request again'}
    </button>
  {:else}
    <h1 class="text-2xl font-bold text-foreground">You need access</h1>
    <p class="max-w-sm text-center text-sm text-muted-foreground">
      This canvas is private. Request access and the owner will be notified
      right away.
    </p>
    <button
      type="button"
      class="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      disabled={isSubmitting}
      onclick={() => void submitRequest()}
    >
      {isSubmitting ? 'Requesting…' : 'Request access'}
    </button>
  {/if}

  {#if errorMessage}
    <p class="text-sm text-destructive">{errorMessage}</p>
  {/if}

  <a
    href="/home"
    class="mt-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
  >
    Back to dashboard
  </a>
</div>
