import type { PageServerLoad } from './$types'
import { AppError } from '$lib/server/api-error'
import { resolveCanvasAccess } from '$lib/server/canvas-access'
import { getSupabase } from '$lib/server/supabase'
import type { CanvasRole } from '$lib/canvas/roles'

export type CanvasPageAccess =
  | { state: 'member'; role: CanvasRole; canvasTitle: string }
  | { state: 'no-access' }
  | { state: 'not-found' }

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    return {
      canvasId: params.canvasId
    }
  }

  let access: CanvasPageAccess
  try {
    const supabase = getSupabase()
    const resolved = await resolveCanvasAccess(
      supabase,
      params.canvasId,
      locals.user.id
    )

    access = resolved.role
      ? {
          state: 'member',
          role: resolved.role,
          canvasTitle: resolved.canvas.title
        }
      : { state: 'no-access' }
  } catch (error) {
    if (error instanceof AppError && error.code === 'canvas_not_found') {
      access = { state: 'not-found' }
    } else {
      throw error
    }
  }

  return {
    canvasId: params.canvasId,
    userId: locals.user.id,
    userEmail: locals.user.email,
    access
  }
}
