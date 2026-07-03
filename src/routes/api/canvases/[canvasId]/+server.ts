import { json, type RequestHandler } from '@sveltejs/kit'
import {
  canvasRowSchema,
  deleteCanvasResponseSchema,
  getCanvasResponseSchema
} from '$lib/canvas/schema'
import {
  updateCanvasInputSchema,
  updateCanvasResponseSchema
} from '$lib/workspace/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  badRequest,
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import {
  removeCanvasIconObject,
  withCanvasIconUrl
} from '$lib/server/canvas-icons'
import { toCanvas } from '$lib/server/canvas-list'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)

      const { canvas, role } = await requireCanvasRole(
        supabase,
        event.params.canvasId!,
        user.id,
        'reader'
      )

      return json(
        getCanvasResponseSchema.parse({
          item: await withCanvasIconUrl(
            supabase,
            toCanvas(canvasRowSchema.parse(canvas), role)
          )
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const PATCH: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)

      await requireCanvasRole(
        supabase,
        event.params.canvasId!,
        user.id,
        'admin'
      )

      const payload = await parseJsonBody(event.request)
      const input = parseInput(updateCanvasInputSchema, payload)

      const patch = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility }
          : {})
      }

      if (Object.keys(patch).length === 0) {
        throw badRequest('Nothing to update.')
      }

      const { data, error } = await supabase
        .from('canvases')
        .update(patch)
        .eq('id', event.params.canvasId!)
        .select()
        .single()

      if (error || !data) {
        throw notFound('Canvas not found.', {
          code: 'canvas_not_found',
          details: { canvasId: event.params.canvasId }
        })
      }

      return json(
        updateCanvasResponseSchema.parse({
          item: await withCanvasIconUrl(
            supabase,
            toCanvas(canvasRowSchema.parse(data))
          )
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const DELETE: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)

      await requireCanvasRole(
        supabase,
        event.params.canvasId!,
        user.id,
        'owner'
      )

      const { data, error } = await supabase
        .from('canvases')
        .delete()
        .eq('id', event.params.canvasId!)
        .eq('created_by', user.id)
        .select()
        .single()

      if (error || !data) {
        throw notFound('Canvas not found.', {
          code: 'canvas_not_found',
          details: { canvasId: event.params.canvasId }
        })
      }

      const deletedCanvas = canvasRowSchema.parse(data)

      await removeCanvasIconObject(supabase, deletedCanvas.icon_path).catch(
        () => undefined
      )

      return json(
        deleteCanvasResponseSchema.parse({
          item: toCanvas(deletedCanvas)
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
