import type { RequestHandler } from '@sveltejs/kit'
import { userSearchResponseSchema } from '#lib/workspace/schema.js'
import { badRequest, handleApiError, withAuth } from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)

      const query = (event.url.searchParams.get('q') ?? '').trim()

      if (query.length < 2) {
        throw badRequest('Search query must be at least 2 characters.', {
          code: 'query_too_short'
        })
      }

      // Commas and parentheses would break the PostgREST or() filter syntax.
      const sanitized = query.replace(/[,()]/g, '')

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .or(`email.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
        .neq('id', user.id)
        .limit(10)

      if (error) {
        throw error
      }

      return Response.json(
        userSearchResponseSchema.parse({
          items: (data ?? []).map((profile) => ({
            id: profile.id,
            email: profile.email,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url
          }))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
