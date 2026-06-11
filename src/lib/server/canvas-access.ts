import type { SupabaseClient } from '@supabase/supabase-js'
import { forbidden, notFound } from '$lib/server/api-error'
import type { Database } from '$lib/server/database.types'
import { roleAtLeast, type CanvasRole } from '$lib/canvas/roles'

type CanvasRow = Database['public']['Tables']['canvases']['Row']

export type CanvasAccess = {
  canvas: CanvasRow
  role: CanvasRole | null
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

  if (canvas.created_by === userId) {
    return { canvas, role: 'owner' }
  }

  const { data: membership } = await supabase
    .from('canvas_members')
    .select('role')
    .eq('canvas_id', canvasId)
    .eq('user_id', userId)
    .maybeSingle()

  return { canvas, role: membership?.role ?? null }
}

export async function requireCanvasRole(
  supabase: SupabaseClient<Database>,
  canvasId: string,
  userId: string,
  min: CanvasRole
): Promise<{ canvas: CanvasRow; role: CanvasRole }> {
  const { canvas, role } = await resolveCanvasAccess(supabase, canvasId, userId)

  if (role === null) {
    throw forbidden('You do not have access to this canvas.', {
      code: 'canvas_access_denied',
      details: { canvasId }
    })
  }

  if (!roleAtLeast(role, min)) {
    throw forbidden('You do not have permission to do that.', {
      code: 'insufficient_role',
      details: { canvasId, role }
    })
  }

  return { canvas, role }
}
