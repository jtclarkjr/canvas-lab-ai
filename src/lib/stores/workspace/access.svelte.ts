import { goto, invalidateAll } from '$app/navigation'
import { listAccessRequests } from '$lib/workspace/api'
import type { AccessRequest } from '$lib/canvas/schema'
import type { CanvasRole } from '$lib/canvas/roles'
import { ensureSessionInitialized, supabase } from '$lib/auth/session-store'
import { toast } from '$lib/stores/shared/toast.svelte'
import {
  CANVAS_VISIBILITY_CHANGED_EVENT,
  canvasVisibilityChannelName,
  type CanvasVisibilityChangedPayload
} from '$lib/workspace/canvas-visibility-realtime'

type WorkspaceAccessInput = {
  getActiveCanvasId: () => string
  getRole: () => CanvasRole
  getUserId: () => string
  getIsPublicViewer: () => boolean
  getIsAnonymousPublicViewer: () => boolean
  canManageCanvas: () => boolean
}

export function createWorkspaceAccessStore({
  getActiveCanvasId,
  getRole,
  getUserId,
  getIsPublicViewer,
  getIsAnonymousPublicViewer,
  canManageCanvas
}: WorkspaceAccessInput) {
  let shareDialogOpen = $state(false)
  let pendingRequests = $state<AccessRequest[]>([])

  async function refreshPendingRequests(id: string) {
    try {
      const response = await listAccessRequests(id, 'pending')
      pendingRequests = response.items
    } catch {
      // Non-fatal: the badge just stays stale until the dialog is opened.
    }
  }

  function openShareDialog() {
    shareDialogOpen = true
  }

  function handleRequestResolved(requestId: string) {
    pendingRequests = pendingRequests.filter((entry) => entry.id !== requestId)
  }

  $effect(() => {
    const client = supabase
    const id = getActiveCanvasId()
    if (!client || !id || !canManageCanvas()) {
      pendingRequests = []
      return
    }

    void refreshPendingRequests(id)

    let cancelled = false

    const channel = client
      .channel(`canvas:${id}:access-requests`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_access_requests',
          filter: `canvas_id=eq.${id}`
        },
        () => {
          void refreshPendingRequests(id).then(() => {
            toast.show({
              title: 'New access request',
              description: 'Someone wants to join this canvas.',
              action: {
                label: 'Review',
                onClick: () => (shareDialogOpen = true)
              }
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_access_requests',
          filter: `canvas_id=eq.${id}`
        },
        (payload) => {
          const next = payload.new as { id?: string; status?: string }
          if (next.id && next.status !== 'pending') {
            pendingRequests = pendingRequests.filter(
              (entry) => entry.id !== next.id
            )
          }
        }
      )

    void ensureSessionInitialized().then((session) => {
      if (cancelled) return
      if (session?.access_token) {
        void client.realtime.setAuth(session.access_token)
      }
      channel.subscribe()
    })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  })

  $effect(() => {
    const client = supabase
    const id = getActiveCanvasId()
    const role = getRole()
    const userId = getUserId()
    if (!client || !id || role === 'owner') {
      return
    }

    let cancelled = false
    let membershipRowId: string | null = null

    function kickOut(message: string) {
      toast.show({ title: 'Access changed', description: message })
      void invalidateAll()
    }

    const channel = client
      .channel(`canvas:${id}:membership`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_members',
          filter: `canvas_id=eq.${id}`
        },
        (payload) => {
          const next = payload.new as {
            id?: string
            user_id?: string
            role?: CanvasRole
          }
          if (next.user_id === userId) {
            membershipRowId = next.id ?? membershipRowId
            // Upserts that keep the role unchanged (e.g. approving a
            // reader's editor request as reader) are not a role change.
            if (next.role !== role) {
              kickOut('Your role on this canvas was changed.')
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'canvas_members'
        },
        (payload) => {
          const previous = payload.old as {
            id?: string
            user_id?: string
            canvas_id?: string
          }
          const matchesRowId =
            membershipRowId !== null && previous.id === membershipRowId
          const matchesColumns =
            previous.user_id === userId && previous.canvas_id === id
          if (matchesRowId || matchesColumns) {
            kickOut('Your access to this canvas was removed.')
          }
        }
      )

    void ensureSessionInitialized().then(async (session) => {
      if (cancelled) return
      if (session?.access_token) {
        void client.realtime.setAuth(session.access_token)
      }

      const { data: membership } = await client
        .from('canvas_members')
        .select('id')
        .eq('canvas_id', id)
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return
      membershipRowId = (membership as { id: string } | null)?.id ?? null
      channel.subscribe()
    })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  })

  // Public viewers hold no membership row, so the membership channel never
  // fires for them — they get kicked by watching the canvas row itself for
  // a public→private flip.
  $effect(() => {
    const client = supabase
    const id = getActiveCanvasId()
    if (!client || !id || !getIsPublicViewer()) {
      return
    }

    let cancelled = false
    let handledPrivateVisibility = false

    function handlePrivateVisibility() {
      if (handledPrivateVisibility) {
        return
      }
      handledPrivateVisibility = true

      toast.show({
        title: 'Access changed',
        description: 'This canvas is now private.'
      })

      if (getIsAnonymousPublicViewer()) {
        void goto(`/login?redirect=${encodeURIComponent(`/canvas/${id}`)}`, {
          replaceState: true
        })
        return
      }

      void invalidateAll()
    }

    const channel = client
      .channel(canvasVisibilityChannelName(id))
      .on(
        'broadcast',
        { event: CANVAS_VISIBILITY_CHANGED_EVENT },
        ({ payload }) => {
          const next = payload as CanvasVisibilityChangedPayload
          if (next.canvasId === id && next.visibility === 'private') {
            handlePrivateVisibility()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvases',
          filter: `id=eq.${id}`
        },
        (payload) => {
          const next = payload.new as { visibility?: string }
          if (next.visibility === 'private') {
            handlePrivateVisibility()
          }
        }
      )

    void ensureSessionInitialized().then((session) => {
      if (cancelled) return
      if (session?.access_token) {
        void client.realtime.setAuth(session.access_token)
      }
      channel.subscribe()
    })

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  })

  return {
    openShareDialog,
    handleRequestResolved,
    get shareDialogOpen() {
      return shareDialogOpen
    },
    set shareDialogOpen(open: boolean) {
      shareDialogOpen = open
    },
    get pendingRequests() {
      return pendingRequests
    }
  }
}
