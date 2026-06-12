import type { PageServerLoad } from './$types'
import { sceneDocumentsDependency } from '$lib/canvas/dependencies'
import { AppError } from '$lib/server/api-error'
import { resolveCanvasAccess } from '$lib/server/canvas-access'
import {
  groupSceneDocumentItemsBySceneId,
  listSceneDocumentItemsForCanvas,
  type SceneDocumentListsBySceneId
} from '$lib/server/scene-documents'
import { getSupabase } from '$lib/server/supabase'
import type { CanvasRole } from '$lib/canvas/roles'

export type CanvasPageAccess =
  | { state: 'member'; role: CanvasRole; canvasTitle: string }
  | { state: 'public-viewer'; canvasTitle: string }
  | { state: 'no-access' }
  | { state: 'not-found' }

export const load: PageServerLoad = async ({ params, locals, depends }) => {
  depends(sceneDocumentsDependency(params.canvasId))

  if (!locals.user) {
    return {
      canvasId: params.canvasId,
      sceneDocumentListsBySceneId: {}
    }
  }

  let access: CanvasPageAccess
  let sceneDocumentListsBySceneId: SceneDocumentListsBySceneId = {}
  try {
    const supabase = getSupabase()
    const resolved = await resolveCanvasAccess(
      supabase,
      params.canvasId,
      locals.user.id
    )

    if (resolved.role) {
      access = {
        state: 'member',
        role: resolved.role,
        canvasTitle: resolved.canvas.title
      }
    } else if (resolved.publicAccess) {
      access = { state: 'public-viewer', canvasTitle: resolved.canvas.title }
    } else {
      access = { state: 'no-access' }
    }

    if (resolved.role || resolved.publicAccess) {
      sceneDocumentListsBySceneId = groupSceneDocumentItemsBySceneId(
        (await listSceneDocumentItemsForCanvas(supabase, params.canvasId)).items
      )
    }
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
    access,
    sceneDocumentListsBySceneId
  }
}
