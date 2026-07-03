import { json, type RequestHandler } from '@sveltejs/kit'
import { promptAiUsageResponseSchema } from '$lib/ai/usage'
import { getPromptAiUsageSummary } from '$lib/server/ai-usage'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const summary = await getPromptAiUsageSummary({
        supabase,
        userId: user.id
      })

      return json(promptAiUsageResponseSchema.parse(summary))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
