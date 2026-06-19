import { json, type RequestHandler } from '@sveltejs/kit'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  listCanvasWorkflowsForCanvas,
  toCanvasWorkflow
} from '$lib/server/canvas-workflows'
import {
  badRequest,
  handleApiError,
  parseInput,
  parseJsonBody,
  requireRouteParam,
  withAccountAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { requireWorkflowsEnabled } from '$lib/server/features'
import { toDbJson } from '$lib/server/json'
import {
  createDefaultDefinitionForFlowType,
  getWorkflowFlowTypeDefinition
} from '$lib/workflows/flow-types'
import {
  workflowDefinitionFromYaml,
  workflowDefinitionToYaml
} from '$lib/workflows/definition'
import {
  createWorkflowInputSchema,
  workflowResponseSchema,
  type WorkflowDefinition
} from '$lib/workflows/schema'

const DEFAULT_WORKFLOW_SIZE = { width: 760, height: 500 }

function parseWorkflowYaml(configYaml: string): WorkflowDefinition {
  try {
    return workflowDefinitionFromYaml(configYaml)
  } catch (error) {
    throw badRequest('Workflow YAML is not valid.', {
      code: 'invalid_workflow_yaml',
      details: {
        message: error instanceof Error ? error.message : 'Unknown YAML error.'
      }
    })
  }
}

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      requireWorkflowsEnabled()
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')

      return json(await listCanvasWorkflowsForCanvas(supabase, canvasId))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      requireWorkflowsEnabled()
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = requireRouteParam(
        event.params.canvasId,
        'Canvas id',
        'canvasId'
      )

      await requireCanvasRole(supabase, canvasId, user.id, 'editor')

      const payload = await parseJsonBody(event.request)
      const input = parseInput(createWorkflowInputSchema, payload)
      const flowType = input.flowType ?? 'workflow'
      const flowTypeDefinition = getWorkflowFlowTypeDefinition(flowType)
      const title = input.title ?? flowTypeDefinition.defaultTitle
      const definition = input.configYaml
        ? parseWorkflowYaml(input.configYaml)
        : (input.definition ??
          createDefaultDefinitionForFlowType(flowType, title))
      const configYaml =
        input.configYaml ?? workflowDefinitionToYaml(definition)

      const { data, error } = await supabase
        .from('canvas_workflows')
        .insert({
          canvas_id: canvasId,
          title,
          x: input.x,
          y: input.y,
          width: input.width ?? DEFAULT_WORKFLOW_SIZE.width,
          height: input.height ?? DEFAULT_WORKFLOW_SIZE.height,
          rotation: input.rotation ?? 0,
          definition: toDbJson(definition),
          config_yaml: configYaml,
          notes: input.notes ?? '',
          settings: toDbJson(
            input.settings ?? {
              context: {
                documentIds: [],
                sceneIds: [],
                includeLinkedScenes: true
              }
            }
          ),
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create workflow')
      }

      return json(
        workflowResponseSchema.parse({ item: toCanvasWorkflow(data) }),
        {
          status: 201
        }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
