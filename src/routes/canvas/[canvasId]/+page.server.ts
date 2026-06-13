import type { PageServerLoad } from './$types'
import { sceneDocumentsDependency } from '$lib/canvas/dependencies'
import { AppError } from '$lib/server/api-error'
import { resolveCanvasAccess } from '$lib/server/canvas-access'
import { listCanvasElementsForCanvas } from '$lib/server/canvas-elements'
import { listCanvasScenesForCanvas } from '$lib/server/canvas-scenes'
import { listCanvasWorkflowsForCanvas } from '$lib/server/canvas-workflows'
import { workflowsEnabled } from '$lib/server/features'
import {
  groupSceneDocumentItemsBySceneId,
  listSceneDocumentItemsForCanvas,
  type SceneDocumentListsBySceneId
} from '$lib/server/scene-documents'
import { getSupabase } from '$lib/server/supabase'
import type { CanvasElement } from '$lib/workspace/schema'
import type { CanvasRole } from '$lib/canvas/roles'
import type { Scene } from '$lib/scenes/schema'
import type { Workflow } from '$lib/workflows/schema'

export type CanvasPageAccess =
  | { state: 'member'; role: CanvasRole; canvasTitle: string }
  | { state: 'public-viewer'; canvasTitle: string }
  | { state: 'no-access' }
  | { state: 'not-found' }

export const load: PageServerLoad = async ({ params, locals, depends }) => {
  depends(sceneDocumentsDependency(params.canvasId))
  const workflowEnabled = workflowsEnabled()

  if (!locals.user) {
    return {
      canvasId: params.canvasId,
      initialElements: [],
      initialScenes: [],
      initialWorkflows: [],
      workflowEnabled,
      sceneDocumentListsBySceneId: {}
    }
  }

  let access: CanvasPageAccess
  let initialElements: CanvasElement[] = []
  let initialScenes: Scene[] = []
  let initialWorkflows: Workflow[] = []
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
      const [elements, scenes, workflows, sceneDocuments] = await Promise.all([
        listCanvasElementsForCanvas(supabase, params.canvasId),
        listCanvasScenesForCanvas(supabase, params.canvasId),
        workflowEnabled
          ? listCanvasWorkflowsForCanvas(supabase, params.canvasId)
          : Promise.resolve({ items: [] }),
        listSceneDocumentItemsForCanvas(supabase, params.canvasId)
      ])

      initialElements = elements.items
      initialScenes = scenes.items
      initialWorkflows = workflows.items
      sceneDocumentListsBySceneId = groupSceneDocumentItemsBySceneId(
        sceneDocuments.items
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
    initialElements,
    initialScenes,
    initialWorkflows,
    workflowEnabled,
    sceneDocumentListsBySceneId
  }
}
