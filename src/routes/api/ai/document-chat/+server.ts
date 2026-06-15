import type { RequestHandler } from '@sveltejs/kit'
import type { UIMessage } from 'ai'
import {
  documentChatRequestSchema,
  markdownDocumentContentSchema
} from '$lib/scenes/schema'
import { getDocumentCategory } from '$lib/scenes/document-categories'
import { getLinkedContextSceneIds } from '$lib/scenes/context-links'
import { isKnownModelId } from '$lib/scenes/models'
import { AiModelError, streamDocumentChat } from '$lib/server/ai'
import type { ContextDocumentRef } from '$lib/server/ai/types'
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
import { canvasElementToConnector } from '$lib/workspace/element-mapping'

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
      let contextDocuments: ContextDocumentRef[] = []
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

        contextDocuments = valid.map((row) => ({
          id: row.id,
          title: row.title,
          sceneId: row.scene_id,
          source: 'manual'
        }))
      }

      const { data: connectorRows, error: connectorError } = await supabase
        .from('canvas_elements')
        .select('id, data')
        .eq('canvas_id', input.canvasId)
        .eq('type', 'connector')

      if (connectorError) {
        throw connectorError
      }

      const linkedSceneIds = getLinkedContextSceneIds(
        input.sceneId,
        (connectorRows ?? [])
          .map((row) =>
            canvasElementToConnector({
              id: row.id,
              canvasId: input.canvasId,
              type: 'connector',
              data: row.data,
              x: 0,
              y: 0,
              z: null
            })
          )
          .filter((connector) => connector !== null)
      )

      if (linkedSceneIds.length > 0) {
        const { data: linkedScenes, error: linkedScenesError } = await supabase
          .from('canvas_scenes')
          .select('id, title')
          .eq('canvas_id', input.canvasId)
          .in('id', linkedSceneIds)

        if (linkedScenesError) {
          throw linkedScenesError
        }

        const sceneTitles = new Map(
          (linkedScenes ?? []).map((linkedScene) => [
            linkedScene.id,
            linkedScene.title
          ])
        )

        const { data: linkedDocuments, error: linkedDocumentsError } =
          await supabase
            .from('canvas_scene_documents')
            .select('id, title, scene_id')
            .eq('canvas_id', input.canvasId)
            .eq('status', 'saved')
            .in('scene_id', linkedSceneIds)

        if (linkedDocumentsError) {
          throw linkedDocumentsError
        }

        const seenContextIds = new Set(contextDocuments.map((doc) => doc.id))
        for (const document of linkedDocuments ?? []) {
          if (seenContextIds.has(document.id)) continue
          seenContextIds.add(document.id)
          contextDocuments.push({
            id: document.id,
            title: document.title,
            sceneId: document.scene_id,
            sceneTitle: sceneTitles.get(document.scene_id) ?? 'Untitled scene',
            source: 'linked-scene'
          })
        }
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

      const messages = input.messages as UIMessage[]

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
        onFinish: async ({
          messages: updatedMessages,
          responseMessage,
          isAborted
        }) => {
          if (isAborted) {
            return
          }

          try {
            await persistDocumentChat({
              supabase,
              scene,
              documentId: input.documentId,
              userId: user.id,
              author: {
                id: user.id,
                name: user.name ?? user.email ?? 'Someone'
              },
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
