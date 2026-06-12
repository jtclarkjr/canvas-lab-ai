import type { RequestHandler } from '@sveltejs/kit'
import type { UIMessage } from 'ai'
import {
  documentChatRequestSchema,
  markdownDocumentContentSchema
} from '$lib/scenes/schema'
import { getDocumentCategory } from '$lib/scenes/document-categories'
import { isKnownModelId } from '$lib/scenes/models'
import { AiModelError, streamDocumentChat } from '$lib/server/ai'
import { getAiRegistry } from '$lib/server/ai-runtime'
import { persistDocumentChat } from '$lib/server/document-chat'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  assertSceneModify,
  requireScene,
  requireSceneDocument
} from '$lib/server/scene-access'
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

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(documentChatRequestSchema, payload)

      if (!isKnownModelId(input.modelId)) {
        throw badRequest('Unknown model.', {
          code: 'unknown_model',
          details: { modelId: input.modelId }
        })
      }

      if (!getDocumentCategory(input.category)) {
        throw badRequest('Unknown document category.', {
          code: 'unknown_category',
          details: { category: input.category }
        })
      }

      const { role } = await requireCanvasRole(
        supabase,
        input.canvasId,
        user.id,
        'editor'
      )
      const scene = await requireScene(supabase, input.canvasId, input.sceneId)
      assertSceneModify(role, scene, user.id)
      const activeDocumentRow = await requireSceneDocument(
        supabase,
        input.sceneId,
        input.documentId
      )

      // Context documents must be saved documents of this same scene.
      let contextDocuments: Array<{ id: string; title: string }> = []
      if (input.contextDocumentIds.length > 0) {
        const { data, error } = await supabase
          .from('canvas_scene_documents')
          .select('id, title, status, scene_id')
          .in('id', input.contextDocumentIds)

        if (error) {
          throw error
        }

        const valid = (data ?? []).filter(
          (row) => row.scene_id === input.sceneId && row.status === 'saved'
        )

        if (valid.length !== input.contextDocumentIds.length) {
          throw badRequest(
            'Context documents must be saved documents in this scene.',
            { code: 'invalid_context_documents' }
          )
        }

        contextDocuments = valid.map((row) => ({ id: row.id, title: row.title }))
      }

      let resolved
      try {
        resolved = getAiRegistry().resolve(input.modelId)
      } catch (error) {
        if (error instanceof AiModelError) {
          throw badRequest(error.message, { code: error.code })
        }
        throw error
      }

      const activeContent = markdownDocumentContentSchema.safeParse(
        activeDocumentRow.content
      )
      const activeDocument =
        activeContent.success && activeContent.data.markdown
          ? {
              title: activeDocumentRow.title,
              markdown: activeContent.data.markdown
            }
          : null

      const messages = input.messages as unknown as UIMessage[]

      const result = await streamDocumentChat({
        resolved,
        category: input.category,
        webSearch: input.webSearch,
        messages,
        activeDocument,
        contextDocuments,
        loadContextDocument: async (documentId) => {
          const { data } = await supabase
            .from('canvas_scene_documents')
            .select('title, content')
            .eq('id', documentId)
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
        // The id is generated here and sent down the stream so the client's
        // local assistant message and the persisted row share one id —
        // otherwise the realtime echo of the row can't be deduped and shows
        // up as a duplicate block.
        generateMessageId: () => crypto.randomUUID(),
        sendSources: true,
        onFinish: async ({ messages: updatedMessages, responseMessage, isAborted }) => {
          if (isAborted) {
            return
          }

          try {
            await persistDocumentChat({
              supabase,
              scene,
              documentId: input.documentId,
              userId: user.id,
              modelId: input.modelId,
              messages: updatedMessages,
              responseMessage
            })
          } catch (error) {
            logServerError({
              error: internalServerError('Failed to persist document chat.', {
                code: 'document_chat_persistence_failed',
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
