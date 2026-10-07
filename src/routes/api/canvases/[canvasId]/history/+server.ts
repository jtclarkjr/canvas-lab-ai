import type { RequestHandler } from '@sveltejs/kit'
import { listCanvasHistoryResponseSchema } from '#lib/workspace/schema.js'
import {
  getCanvasHistoryNextBefore,
  toCanvasHistoryEntry
} from '#lib/workspace/canvas-history.js'
import { requireCanvasRole } from '#lib/server/canvas-access.js'
import {
  badRequest,
  handleApiError,
  requireRouteParam,
  withAccountAuth
} from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function parseLimit(value: string | null) {
  if (!value) {
    return DEFAULT_LIMIT
  }

  const limit = Number(value)
  if (!Number.isInteger(limit) || limit < 1) {
    throw badRequest('Limit must be a positive integer.', {
      code: 'invalid_limit'
    })
  }

  return Math.min(limit, MAX_LIMIT)
}

function parseBefore(value: string | null) {
  if (!value) {
    return null
  }

  if (Number.isNaN(Date.parse(value))) {
    throw badRequest('Before must be a valid ISO timestamp.', {
      code: 'invalid_before'
    })
  }

  return value
}

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
      const limit = parseLimit(event.url.searchParams.get('limit'))
      const before = parseBefore(event.url.searchParams.get('before'))

      await requireCanvasRole(supabase, canvasId, user.id, 'admin')

      let query = supabase
        .from('canvas_history')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error } = await query
      if (error) {
        throw error
      }

      const items = (data ?? []).map(toCanvasHistoryEntry)

      return Response.json(
        listCanvasHistoryResponseSchema.parse({
          items,
          nextBefore: getCanvasHistoryNextBefore(items, limit)
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
