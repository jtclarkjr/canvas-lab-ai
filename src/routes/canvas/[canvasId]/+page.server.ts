import type { PageServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'
import { sceneDocumentsDependency } from '$lib/canvas/dependencies'
import { AppError } from '$lib/server/api-error'
import { createAnonymousRequestSession } from '$lib/server/anonymous-session'
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
  | { state: 'anonymous-public-viewer'; canvasTitle: string }
  | { state: 'no-access' }
  | { state: 'not-found' }

export const load: PageServerLoad = async ({
  params,
  locals,
  depends,
  cookies,
  url
}) => {
  depends(sceneDocumentsDependency(params.canvasId))
  const workflowEnabled = workflowsEnabled()

  const supabase = getSupabase()
  let user = locals.user

  if (!user) {
    const { data: canvas, error } = await supabase
      .from('canvases')
      .select('id, title, visibility')
      .eq('id', params.canvasId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!canvas) {
      return {
        canvasId: params.canvasId,
        access: { state: 'not-found' } satisfies CanvasPageAccess,
        initialElements: [],
        initialScenes: [],
        initialWorkflows: [],
        workflowEnabled,
        sceneDocumentListsBySceneId: {}
      }
    }

    if (canvas.visibility !== 'public') {
      const redirectTo = `${url.pathname}${url.search}`
      throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`)
    }

    const session = await createAnonymousRequestSession(cookies)
    user = session.user
    locals.user = user
  }

  let access: CanvasPageAccess
  let initialElements: CanvasElement[] = []
  let initialScenes: Scene[] = []
  let initialWorkflows: Workflow[] = []
  let sceneDocumentListsBySceneId: SceneDocumentListsBySceneId = {}
  try {
    const resolved = await resolveCanvasAccess(
      supabase,
      params.canvasId,
      user.id
    )

    if (resolved.role) {
      access = {
        state: 'member',
        role: resolved.role,
        canvasTitle: resolved.canvas.title
      }
    } else if (resolved.publicAccess && user.isAnonymous) {
      access = {
        state: 'anonymous-public-viewer',
        canvasTitle: resolved.canvas.title
      }
    } else if (resolved.publicAccess) {
      access = { state: 'public-viewer', canvasTitle: resolved.canvas.title }
    } else {
      if (user.isAnonymous) {
        const redirectTo = `${url.pathname}${url.search}`
        throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`)
      }
      access = { state: 'no-access' }
    }

    if (resolved.role || resolved.publicAccess) {
      const anonymousLimitedView = access.state === 'anonymous-public-viewer'
      const [elements, scenes, workflows, sceneDocuments] = await Promise.all([
        listCanvasElementsForCanvas(supabase, params.canvasId, {
          excludeSceneBoundConnectors: anonymousLimitedView
        }),
        anonymousLimitedView
          ? Promise.resolve({ items: [] })
          : listCanvasScenesForCanvas(supabase, params.canvasId),
        workflowEnabled && !anonymousLimitedView
          ? listCanvasWorkflowsForCanvas(supabase, params.canvasId)
          : Promise.resolve({ items: [] }),
        anonymousLimitedView
          ? Promise.resolve({ items: [] })
          : listSceneDocumentItemsForCanvas(supabase, params.canvasId)
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
    userId: user.id,
    userEmail: user.email,
    access,
    initialElements,
    initialScenes,
    initialWorkflows,
    workflowEnabled,
    sceneDocumentListsBySceneId
  }
}
