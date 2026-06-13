import { json, type RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// Strip HTML tags, control characters, and normalize whitespace before the
// name leaves the server. This is the primary sanitization boundary.
function sanitizeName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

const responseSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() }))
})

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { canvas } = await requireCanvasMember(
        supabase,
        canvasId,
        user.id,
        'reader'
      )

      const { data: members, error } = await supabase
        .from('canvas_members')
        .select('user_id')
        .eq('canvas_id', canvasId)

      if (error) throw error

      const userIds = [
        ...new Set([
          canvas.created_by,
          ...(members ?? []).map((m) => m.user_id)
        ])
      ]

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)

      if (profilesError) throw profilesError

      const items = (profiles ?? [])
        .map((p) => ({
          id: p.id,
          name: sanitizeName(p.display_name || p.email || '')
        }))
        .filter((item) => item.name.length > 0)

      return json(responseSchema.parse({ items }))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
