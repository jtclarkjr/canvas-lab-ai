import { json, type RequestHandler } from '@sveltejs/kit'
import {
  canvasElementRowSchema,
  listElementsResponseSchema,
  upsertElementInputSchema,
  upsertElementResponseSchema
} from '$lib/canvas/schema'
import type { CanvasElementRow } from '$lib/canvas/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  forbidden,
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import type { Json } from '$lib/server/database.types'

const toElement = (row: CanvasElementRow) => ({
  id: row.id,
  canvasId: row.canvas_id,
  type: row.type,
  data: row.data,
  x: row.x,
  y: row.y,
  z: row.z,
  createdBy: row.created_by ?? null,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at
})

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
        .from('canvas_elements')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('updated_at', { ascending: true })

      if (error) {
        throw error
      }

      return json(
        listElementsResponseSchema.parse({
          items: (data ?? []).map((row) =>
            toElement(canvasElementRowSchema.parse(row))
          )
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

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )

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
        data: (input.data ?? null) as Json | null,
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

        if (role === 'editor' && existing.data.created_by !== user.id) {
          throw forbidden('You can only edit elements you created.', {
            code: 'element_forbidden',
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

      return json(
        upsertElementResponseSchema.parse({
          item: toElement(canvasElementRowSchema.parse(data))
        }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
