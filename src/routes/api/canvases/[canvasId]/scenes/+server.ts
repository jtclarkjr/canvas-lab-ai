import { json, type RequestHandler } from '@sveltejs/kit'
import { createSceneInputSchema, sceneResponseSchema } from '$lib/scenes/schema'
import { getSceneType } from '$lib/scenes/registry'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  listCanvasScenesForCanvas,
  toCanvasScene
} from '$lib/server/canvas-scenes'
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

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')

      return json(await listCanvasScenesForCanvas(supabase, canvasId))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasRole(supabase, canvasId, user.id, 'editor')

      const payload = await parseJsonBody(event.request)
      const input = parseInput(createSceneInputSchema, payload)

      const sceneType = getSceneType(input.type)
      if (!sceneType) {
        throw badRequest('Unknown scene type.', {
          code: 'unknown_scene_type',
          details: { type: input.type }
        })
      }

      const { data, error } = await supabase
        .from('canvas_scenes')
        .insert({
          canvas_id: canvasId,
          type: input.type,
          title: input.title ?? sceneType.defaultTitle,
          x: input.x,
          y: input.y,
          width: input.width ?? sceneType.defaultSize.width,
          height: input.height ?? sceneType.defaultSize.height,
          rotation: input.rotation ?? 0,
          settings: toDbJson(input.settings ?? {}),
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create scene')
      }

      return json(sceneResponseSchema.parse({ item: toCanvasScene(data) }), {
        status: 201
      })
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
