import type { RequestHandler } from '@sveltejs/kit'
import { promptAiUsageResponseSchema } from '#lib/ai/usage.js'
import { getPromptAiUsageSummary } from '#lib/server/ai-usage.js'
import { handleApiError, withAuth } from '#lib/server/api-error.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const summary = await getPromptAiUsageSummary({
        supabase,
        userId: user.id
      })

      return Response.json(promptAiUsageResponseSchema.parse(summary))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
