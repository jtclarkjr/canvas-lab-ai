import { json, type RequestHandler } from '@sveltejs/kit'
import { sceneResponseSchema, updateSceneInputSchema } from '$lib/scenes/schema'
import { getSceneType } from '$lib/scenes/registry'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { assertSceneModify, requireScene } from '$lib/server/scene-access'
import { toCanvasScene } from '$lib/server/canvas-scenes'
import {
  badRequest,
  handleApiError,
  parseInput,
  parseJsonBody,
  requireRouteParam,
  withAccountAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { toDbJson } from '$lib/server/json'

export const PATCH: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )
      const sceneId = requireRouteParam(
        event.params.sceneId,
        'Scene id',
        'sceneId'
      )

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const scene = await requireScene(supabase, canvasId, sceneId)
      assertSceneModify(role, scene, user.id)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(updateSceneInputSchema, payload)

      if (input.type !== undefined && !getSceneType(input.type)) {
        throw badRequest('Unknown scene type.', {
          code: 'unknown_scene_type',
          details: { type: input.type }
        })
      }

      const { data, error } = await supabase
        .from('canvas_scenes')
        .update({
          ...(input.type !== undefined ? { type: input.type } : null),
          ...(input.title !== undefined ? { title: input.title } : null),
          ...(input.x !== undefined ? { x: input.x } : null),
          ...(input.y !== undefined ? { y: input.y } : null),
          ...(input.width !== undefined ? { width: input.width } : null),
          ...(input.height !== undefined ? { height: input.height } : null),
          ...(input.rotation !== undefined
            ? { rotation: input.rotation }
            : null),
          ...(input.settings !== undefined
            ? { settings: toDbJson(input.settings) }
            : null),
          updated_by: user.id
        })
        .eq('id', scene.id)
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to update scene')
      }

      return json(sceneResponseSchema.parse({ item: toCanvasScene(data) }))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const DELETE: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )
      const sceneId = requireRouteParam(
        event.params.sceneId,
        'Scene id',
        'sceneId'
      )

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const scene = await requireScene(supabase, canvasId, sceneId)
      assertSceneModify(role, scene, user.id)

      const { error } = await supabase
        .from('canvas_scenes')
        .delete()
        .eq('id', scene.id)

      if (error) {
        throw error
      }

      return json(sceneResponseSchema.parse({ item: toCanvasScene(scene) }))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
