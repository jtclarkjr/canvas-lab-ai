import { json, type RequestHandler } from '@sveltejs/kit'
import {
  canvasRowSchema,
  deleteCanvasResponseSchema,
  getCanvasResponseSchema,
  updateCanvasInputSchema,
  updateCanvasResponseSchema
} from '$lib/canvas/schema'
import type { CanvasRow } from '$lib/canvas/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

const toCanvas = (row: CanvasRow) => ({
  id: row.id,
  title: row.title,
  createdBy: row.created_by,
  createdAt: row.created_at
})

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
          item: { ...toCanvas(canvas), role }
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

      const { data, error } = await supabase
        .from('canvases')
        .update({ title: input.title })
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
          item: toCanvas(canvasRowSchema.parse(data))
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

      return json(
        deleteCanvasResponseSchema.parse({
          item: toCanvas(canvasRowSchema.parse(data))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
