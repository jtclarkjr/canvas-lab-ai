import type { RequestHandler } from '@sveltejs/kit'
import {
  upsertElementInputSchema,
  upsertElementResponseSchema
} from '#lib/workspace/schema.js'
import { requireCanvasRole } from '#lib/server/canvas-access.js'
import {
  listCanvasElementsForCanvas,
  toCanvasElement
} from '#lib/server/canvas-elements.js'
import { recordCanvasHistory } from '#lib/server/canvas-history.js'
import {
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  requireRouteParam,
  withAccountAuth,
  withAuth
} from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'
import { toNullableDbJson } from '#lib/server/json.js'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')

      return Response.json(
        await listCanvasElementsForCanvas(supabase, canvasId, {
          excludeSceneBoundConnectors: user.isAnonymous
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
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasRole(supabase, canvasId, user.id, 'editor')

      const payload = await parseJsonBody(event.request)
      const input = parseInput(upsertElementInputSchema, payload)

      const existing = input.id
        ? await supabase
            .from('canvas_elements')
            .select('id, canvas_id, created_by')
            .eq('id', input.id)
            .maybeSingle()
        : null

      if (existing?.error) {
        throw existing.error
      }

      const updates = {
        type: input.type,
        data: toNullableDbJson(input.data),
        x: input.x,
        y: input.y,
        z: input.z ?? null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      let result
      if (existing?.data) {
        // An element id can only be reused within its own canvas; otherwise a
        // caller could hijack an element belonging to another canvas.
        if (existing.data.canvas_id !== canvasId) {
          throw notFound('Element not found.', {
            code: 'element_not_found',
            details: { elementId: input.id }
          })
        }

        result = await supabase
          .from('canvas_elements')
          .update(updates)
          .eq('id', existing.data.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('canvas_elements')
          .insert({
            id: input.id,
            canvas_id: canvasId,
            created_by: user.id,
            ...updates
          })
          .select()
          .single()
      }

      const { data, error } = result

      if (error || !data) {
        throw error ?? new Error('Failed to upsert canvas element')
      }

      await recordCanvasHistory(supabase, {
        canvasId,
        defaultAction: existing?.data ? 'modified' : 'created',
        elementId: data.id,
        elementType: data.type,
        audit: input.audit,
        actor: user
      })

      return Response.json(
        upsertElementResponseSchema.parse({
          item: toCanvasElement(data)
        }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
