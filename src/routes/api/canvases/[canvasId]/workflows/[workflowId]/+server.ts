import { json, type RequestHandler } from '@sveltejs/kit'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { toCanvasWorkflow } from '$lib/server/canvas-workflows'
import type { Database, Json } from '$lib/server/database.types'
import {
  assertWorkflowModify,
  requireWorkflow
} from '$lib/server/workflow-access'
import {
  badRequest,
  handleApiError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { requireWorkflowsEnabled } from '$lib/server/features'
import {
  workflowDefinitionFromYaml,
  workflowDefinitionToYaml
} from '$lib/workflows/definition'
import {
  updateWorkflowInputSchema,
  workflowResponseSchema,
  type WorkflowDefinition
} from '$lib/workflows/schema'

type WorkflowUpdate = Database['public']['Tables']['canvas_workflows']['Update']

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

export const PATCH: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      requireWorkflowsEnabled()
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId, workflowId } = event.params

      if (!canvasId || !workflowId) {
        return json(
          { message: 'Canvas and workflow ids are required.' },
          { status: 400 }
        )
      }

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const workflow = await requireWorkflow(supabase, canvasId, workflowId)
      assertWorkflowModify(role, workflow, user.id)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(updateWorkflowInputSchema, payload)
      const update: WorkflowUpdate = { updated_by: user.id }

      if (input.title !== undefined) update.title = input.title
      if (input.x !== undefined) update.x = input.x
      if (input.y !== undefined) update.y = input.y
      if (input.width !== undefined) update.width = input.width
      if (input.height !== undefined) update.height = input.height
      if (input.rotation !== undefined) update.rotation = input.rotation
      if (input.notes !== undefined) update.notes = input.notes
      if (input.settings !== undefined) update.settings = input.settings as Json

      if (input.configYaml !== undefined) {
        const definition = parseWorkflowYaml(input.configYaml)
        update.definition = definition as Json
        update.config_yaml = input.configYaml
      } else if (input.definition !== undefined) {
        update.definition = input.definition as Json
        update.config_yaml = workflowDefinitionToYaml(input.definition)
      }

      const { data, error } = await supabase
        .from('canvas_workflows')
        .update(update)
        .eq('id', workflow.id)
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to update workflow')
      }

      return json(
        workflowResponseSchema.parse({ item: toCanvasWorkflow(data) })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const DELETE: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      requireWorkflowsEnabled()
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId, workflowId } = event.params

      if (!canvasId || !workflowId) {
        return json(
          { message: 'Canvas and workflow ids are required.' },
          { status: 400 }
        )
      }

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const workflow = await requireWorkflow(supabase, canvasId, workflowId)
      assertWorkflowModify(role, workflow, user.id)

      const { error } = await supabase
        .from('canvas_workflows')
        .delete()
        .eq('id', workflow.id)

      if (error) {
        throw error
      }

      return json(
        workflowResponseSchema.parse({ item: toCanvasWorkflow(workflow) })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
