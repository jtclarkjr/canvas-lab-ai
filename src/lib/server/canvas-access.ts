import type { SupabaseClient } from '@supabase/supabase-js'
import { forbidden, notFound } from '$lib/server/api-error'
import type { Database } from '$lib/server/database.types'
import { roleAtLeast, type CanvasRole } from '$lib/canvas/roles'

type CanvasRow = Database['public']['Tables']['canvases']['Row']

export type CanvasAccess = {
  canvas: CanvasRow
  role: CanvasRole | null
  publicAccess: boolean
}

export async function resolveCanvasAccess(
  supabase: SupabaseClient<Database>,
  canvasId: string,
  userId: string
): Promise<CanvasAccess> {
  const { data: canvas, error } = await supabase
    .from('canvases')
    .select('*')
    .eq('id', canvasId)
    .maybeSingle()

  if (error || !canvas) {
    throw notFound('Canvas not found.', {
      code: 'canvas_not_found',
      details: { canvasId }
    })
  }

  const publicAccess = canvas.visibility === 'public'

  if (canvas.created_by === userId) {
    return { canvas, role: 'owner', publicAccess }
  }

  const { data: membership } = await supabase
    .from('canvas_members')
    .select('role')
    .eq('canvas_id', canvasId)
    .eq('user_id', userId)
    .maybeSingle()

  return { canvas, role: membership?.role ?? null, publicAccess }
}

export async function requireCanvasRole(
  supabase: SupabaseClient<Database>,
  canvasId: string,
  userId: string,
  min: CanvasRole
): Promise<{ canvas: CanvasRow; role: CanvasRole; isPublicViewer: boolean }> {
  const { canvas, role, publicAccess } = await resolveCanvasAccess(
    supabase,
    canvasId,
    userId
  )

  if (role === null) {
    if (!publicAccess) {
      throw forbidden('You do not have access to this canvas.', {
        code: 'canvas_access_denied',
        details: { canvasId }
      })
    }

    // Public viewers get readonly access; insufficient_role (not
    // canvas_access_denied) so the client does not bounce them to the
    // request-access screen on a write attempt.
    if (min !== 'reader') {
      throw forbidden('You do not have permission to do that.', {
        code: 'insufficient_role',
        details: { canvasId, role: 'reader' }
      })
    }

    return { canvas, role: 'reader', isPublicViewer: true }
  }

  if (!roleAtLeast(role, min)) {
    throw forbidden('You do not have permission to do that.', {
      code: 'insufficient_role',
      details: { canvasId, role }
    })
  }

  return { canvas, role, isPublicViewer: false }
}

// Members-only gate: like requireCanvasRole, but public read-only viewers
// of a public canvas are rejected. Used by member features (canvas chat).
export async function requireCanvasMember(
  supabase: SupabaseClient<Database>,
  canvasId: string,
  userId: string,
  min: CanvasRole
): Promise<{ canvas: CanvasRow; role: CanvasRole }> {
  const { canvas, role, isPublicViewer } = await requireCanvasRole(
    supabase,
    canvasId,
    userId,
    min
  )

  if (isPublicViewer) {
    throw forbidden('This feature is only available to canvas members.', {
      code: 'insufficient_role',
      details: { canvasId }
    })
  }

  return { canvas, role }
}
