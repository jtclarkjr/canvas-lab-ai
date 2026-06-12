import { json, type RequestHandler } from '@sveltejs/kit'
import {
  createSceneInputSchema,
  listScenesResponseSchema,
  sceneResponseSchema,
  sceneRowSchema
} from '$lib/scenes/schema'
import { getSceneType } from '$lib/scenes/registry'
import { sceneRowToScene } from '$lib/scenes/mapping'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  badRequest,
  handleApiError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import type { Json } from '$lib/server/database.types'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')

      const { data, error } = await supabase
        .from('canvas_scenes')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return json(
        listScenesResponseSchema.parse({
          items: (data ?? []).map((row) => sceneRowToScene(sceneRowSchema.parse(row)))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

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
          settings: (input.settings ?? {}) as Json,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create scene')
      }

      return json(
        sceneResponseSchema.parse({ item: sceneRowToScene(sceneRowSchema.parse(data)) }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
