import type { RequestHandler } from '@sveltejs/kit'
import {
  canvasRowSchema,
  createCanvasInputSchema,
  createCanvasResponseSchema
} from '#lib/canvas/schema.js'
import {
  handleApiError,
  parseInput,
  parseJsonBody,
  withAccountAuth
} from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'
import { listCanvasesForUser, toCanvas } from '#lib/server/canvas-list.js'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      return Response.json(await listCanvasesForUser(supabase, user.id))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(createCanvasInputSchema, payload)

      const { data, error } = await supabase
        .from('canvases')
        .insert({ title: input.title, created_by: user.id })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create canvas')
      }

      return Response.json(
        createCanvasResponseSchema.parse({
          item: toCanvas(canvasRowSchema.parse(data))
        }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
