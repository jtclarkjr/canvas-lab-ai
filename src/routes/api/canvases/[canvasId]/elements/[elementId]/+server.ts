import type { RequestHandler } from '@sveltejs/kit'
import {
  deleteElementInputSchema,
  deleteElementResponseSchema
} from '#lib/workspace/schema.js'
import { requireCanvasRole } from '#lib/server/canvas-access.js'
import { toCanvasElement } from '#lib/server/canvas-elements.js'
import { recordCanvasHistory } from '#lib/server/canvas-history.js'
import {
  badRequest,
  handleApiError,
  notFound,
  parseInput,
  requireRouteParam,
  withAccountAuth
} from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

async function parseOptionalDeleteInput(request: Request) {
  const text = await request.text()
  if (!text.trim()) {
    return deleteElementInputSchema.parse({})
  }

  try {
    return parseInput(deleteElementInputSchema, JSON.parse(text))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw badRequest('Request body must be valid JSON.', {
        code: 'invalid_json',
        cause: error
      })
    }
    throw error
  }
}

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
      const elementId = requireRouteParam(
        event.params.elementId,
        'Element id',
        'elementId'
      )
      const input = await parseOptionalDeleteInput(event.request)

      await requireCanvasRole(supabase, canvasId, user.id, 'editor')

      const { data: existing, error: existingError } = await supabase
        .from('canvas_elements')
        .select('id, created_by')
        .eq('id', elementId)
        .eq('canvas_id', canvasId)
        .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (!existing) {
        throw notFound('Element not found.', {
          code: 'element_not_found',
          details: { elementId }
        })
      }

      const { data, error } = await supabase
        .from('canvas_elements')
        .delete()
        .eq('id', elementId)
        .eq('canvas_id', canvasId)
        .select()
        .single()

      if (error || !data) {
        throw notFound('Element not found.', {
          code: 'element_not_found',
          details: { elementId }
        })
      }

      await recordCanvasHistory(supabase, {
        canvasId,
        defaultAction: 'deleted',
        elementId: data.id,
        elementType: data.type,
        audit: input.audit,
        actor: user
      })

      return Response.json(
        deleteElementResponseSchema.parse({
          item: toCanvasElement(data)
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
