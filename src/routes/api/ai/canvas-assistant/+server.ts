import type { RequestHandler } from '@sveltejs/kit'
import { canvasAssistantRequestSchema } from '$lib/chat/schema'
import { markdownDocumentContentSchema } from '$lib/scenes/schema'
import { isKnownModelId } from '$lib/scenes/models'
import { AiModelError, streamCanvasAssistant } from '$lib/server/ai'
import { getAiRegistry } from '$lib/server/ai-runtime'
import {
  assertPromptAiUsageAllowed,
  recordPromptAiUsage
} from '$lib/server/ai-usage'
import { persistCanvasAssistantChat } from '$lib/server/canvas-assistant-chat'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  badRequest,
  handleApiError,
  internalServerError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { logServerError } from '$lib/server/logger'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// AI generations are expensive: a much tighter limit than normal writes.
const AI_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 }

// Cap how many saved-document titles get listed in the system prompt.
const CONTEXT_DOCUMENT_LIMIT = 50

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(canvasAssistantRequestSchema, payload)

      if (!isKnownModelId(input.modelId)) {
        throw badRequest('Unknown model.', {
          code: 'unknown_model',
          details: { modelId: input.modelId }
        })
      }

      // Any member can use the Assistant — it's private per user and
      // doesn't modify the canvas.
      await requireCanvasMember(supabase, input.canvasId, user.id, 'reader')
      await assertPromptAiUsageAllowed({
        supabase,
        userId: user.id,
        modelId: input.modelId
      })

      let resolved
      try {
        resolved = getAiRegistry().resolve(input.modelId)
      } catch (error) {
        if (error instanceof AiModelError) {
          throw badRequest(error.message, { code: error.code })
        }
        throw error
      }

      // Saved documents from every scene of the canvas are offered as
      // context: titles go in the system prompt, content loads on demand.
      const { data: savedDocuments, error: savedDocumentsError } =
        await supabase
          .from('canvas_scene_documents')
          .select('id, title')
          .eq('canvas_id', input.canvasId)
          .eq('status', 'saved')
          .order('updated_at', { ascending: false })
          .limit(CONTEXT_DOCUMENT_LIMIT)

      if (savedDocumentsError) {
        throw savedDocumentsError
      }

      const contextDocuments = (savedDocuments ?? []).map((row) => ({
        id: row.id,
        title: row.title
      }))

      const messages = input.messages

      const result = await streamCanvasAssistant({
        resolved,
        webSearch: input.webSearch,
        messages,
        contextDocuments,
        onFinish: ({ totalUsage }) =>
          recordPromptAiUsage({
            supabase,
            request: event.request,
            userId: user.id,
            feature: 'canvas_assistant',
            modelId: input.modelId,
            usage: totalUsage
          }),
        loadContextDocument: async (documentId) => {
          const { data } = await supabase
            .from('canvas_scene_documents')
            .select('title, content, canvas_id')
            .eq('id', documentId)
            .eq('canvas_id', input.canvasId)
            .maybeSingle()

          if (!data) {
            return null
          }

          const parsed = markdownDocumentContentSchema.safeParse(data.content)
          return {
            title: data.title,
            markdown: parsed.success ? parsed.data.markdown : ''
          }
        }
      })

      return result.toUIMessageStreamResponse({
        originalMessages: messages,
        generateMessageId: () => crypto.randomUUID(),
        sendSources: true,
        onFinish: async ({
          messages: updatedMessages,
          responseMessage,
          isAborted
        }) => {
          if (isAborted) {
            return
          }

          try {
            await persistCanvasAssistantChat({
              supabase,
              canvasId: input.canvasId,
              userId: user.id,
              threadId: input.threadId,
              modelId: input.modelId,
              messages: updatedMessages,
              responseMessage
            })
          } catch (error) {
            logServerError({
              error: internalServerError('Failed to persist assistant chat.', {
                code: 'assistant_chat_persistence_failed',
                cause: error
              }),
              request: event.request,
              unexpected: true
            })
          }
        }
      })
    } catch (error) {
      return handleApiError(error, event.request)
    }
  }, AI_RATE_LIMIT)({ request: event.request })
