import { json, type RequestHandler } from '@sveltejs/kit'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { env as privateEnv } from '$env/dynamic/private'
import { captionLanguageLabel } from '$lib/conference/captions'
import {
  translateCaptionInputSchema,
  translateCaptionResponseSchema
} from '$lib/conference/schema'
import {
  handleApiError,
  internalServerError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// Viewers translate one short segment per finished sentence, so this needs
// more headroom than the default POST limit but far less than chat AI.
const TRANSLATE_RATE_LIMIT = { maxRequests: 60, windowMs: 60_000 }

const TRANSLATE_MODEL = 'gpt-4o-mini'

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId } = event.params

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const apiKey = privateEnv.OPENAI_API_KEY
      if (!apiKey) {
        throw internalServerError(
          'Captions are not configured on this server.',
          { code: 'missing_openai_env' }
        )
      }

      const payload = await parseJsonBody(event.request)
      const input = parseInput(translateCaptionInputSchema, payload)
      const label = captionLanguageLabel(input.language)

      const openai = createOpenAI({ apiKey })
      const { text } = await generateText({
        model: openai(TRANSLATE_MODEL),
        system:
          `You translate live meeting captions into ${label} (${input.language}). ` +
          'Reply with ONLY the translated text, no quotes and no commentary. ' +
          'If the text is already in that language, return it unchanged.',
        prompt: input.text,
        temperature: 0,
        maxOutputTokens: 400
      })

      return json(
        translateCaptionResponseSchema.parse({ text: text.trim() })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  }, TRANSLATE_RATE_LIMIT)({ request: event.request })
