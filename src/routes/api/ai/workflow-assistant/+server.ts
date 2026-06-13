import { json, type RequestHandler } from '@sveltejs/kit'
import { generateObject } from 'ai'
import { getLinkedContextSceneIds } from '$lib/scenes/context-links'
import { markdownDocumentContentSchema } from '$lib/scenes/schema'
import { isKnownModelId } from '$lib/scenes/models'
import { AiModelError } from '$lib/server/ai'
import { getAiRegistry } from '$lib/server/ai-runtime'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { listCanvasElementsForCanvas } from '$lib/server/canvas-elements'
import { listCanvasScenesForCanvas } from '$lib/server/canvas-scenes'
import { requireWorkflowsEnabled } from '$lib/server/features'
import { requireWorkflow } from '$lib/server/workflow-access'
import {
  badRequest,
  handleApiError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { canvasElementsToDrawingState } from '$lib/workspace/element-mapping'
import {
  workflowAssistantRequestSchema,
  workflowAssistantResponseSchema,
  workflowProposalSchema
} from '$lib/workflows/schema'
import { workflowDefinitionToYaml as definitionToYaml } from '$lib/workflows/definition'

const AI_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 }
const CONTEXT_DOCUMENT_LIMIT = 12

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      requireWorkflowsEnabled()
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const payload = await parseJsonBody(event.request)
      const input = parseInput(workflowAssistantRequestSchema, payload)

      if (!isKnownModelId(input.modelId)) {
        throw badRequest('Unknown model.', {
          code: 'unknown_model',
          details: { modelId: input.modelId }
        })
      }

      await requireCanvasMember(supabase, input.canvasId, user.id, 'reader')
      await requireWorkflow(supabase, input.canvasId, input.workflowId)

      let resolved
      try {
        resolved = getAiRegistry().resolve(input.modelId)
      } catch (error) {
        if (error instanceof AiModelError) {
          throw badRequest(error.message, { code: error.code })
        }
        throw error
      }

      const [elements, scenesResponse] = await Promise.all([
        listCanvasElementsForCanvas(supabase, input.canvasId),
        listCanvasScenesForCanvas(supabase, input.canvasId)
      ])
      const connectors = canvasElementsToDrawingState(elements.items).connectors
      const sceneIds = new Set(input.context.sceneIds)

      if (input.context.includeLinkedScenes) {
        for (const sceneId of input.context.sceneIds) {
          for (const linkedSceneId of getLinkedContextSceneIds(
            sceneId,
            connectors
          )) {
            sceneIds.add(linkedSceneId)
          }
        }
      }

      const sceneTitleById = new Map(
        scenesResponse.items.map((scene) => [scene.id, scene.title])
      )

      const { data: documents, error: documentsError } = await supabase
        .from('canvas_scene_documents')
        .select('id, scene_id, title, content, status')
        .eq('canvas_id', input.canvasId)
        .eq('status', 'saved')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (documentsError) {
        throw documentsError
      }

      const selectedDocumentIds = new Set(input.context.documentIds)
      const contextDocuments = (documents ?? [])
        .filter(
          (document) =>
            selectedDocumentIds.has(document.id) ||
            sceneIds.has(document.scene_id)
        )
        .slice(0, CONTEXT_DOCUMENT_LIMIT)
        .map((document) => {
          const parsed = markdownDocumentContentSchema.safeParse(
            document.content
          )
          return {
            title: document.title,
            sceneTitle: sceneTitleById.get(document.scene_id) ?? 'Scene',
            markdown: parsed.success ? parsed.data.markdown : ''
          }
        })

      const result = await generateObject({
        model: resolved.model,
        schema: workflowProposalSchema,
        schemaName: 'WorkflowProposal',
        system:
          'You design node-graph workflows. Return a valid workflow proposal only. Nodes may include inert action metadata, but do not claim execution is implemented.',
        prompt: [
          `User request:\n${input.prompt}`,
          `Current workflow YAML:\n${input.workflow.configYaml}`,
          `Current workflow JSON:\n${JSON.stringify(input.workflow.definition)}`,
          `Context documents:\n${contextDocuments
            .map(
              (document) =>
                `# ${document.sceneTitle} / ${document.title}\n${document.markdown.slice(
                  0,
                  6000
                )}`
            )
            .join('\n\n')}`,
          'Return a complete replacement workflow definition. Keep version as 1. Provide configYaml matching the definition.'
        ].join('\n\n---\n\n')
      })

      const proposal = workflowProposalSchema.parse({
        ...result.object,
        configYaml: definitionToYaml(result.object.definition)
      })

      return json(
        workflowAssistantResponseSchema.parse({
          message: proposal.summary,
          proposal
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  }, AI_RATE_LIMIT)({ request: event.request })
