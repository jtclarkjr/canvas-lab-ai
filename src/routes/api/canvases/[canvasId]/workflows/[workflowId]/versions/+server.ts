import { json, type RequestHandler } from '@sveltejs/kit'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  listCanvasWorkflowVersions,
  toCanvasWorkflowVersion
} from '$lib/server/canvas-workflows'
import type { Json } from '$lib/server/database.types'
import {
  assertWorkflowModify,
  requireWorkflow
} from '$lib/server/workflow-access'
import {
  handleApiError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { requireWorkflowsEnabled } from '$lib/server/features'
import {
  createWorkflowVersionInputSchema,
  workflowVersionResponseSchema
} from '$lib/workflows/schema'

export const GET: RequestHandler = async (event) =>
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

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')
      const workflow = await requireWorkflow(supabase, canvasId, workflowId)

      return json(await listCanvasWorkflowVersions(supabase, workflow.id))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
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
      const input = parseInput(createWorkflowVersionInputSchema, payload)

      const { data, error } = await supabase
        .from('canvas_workflow_versions')
        .insert({
          workflow_id: workflow.id,
          canvas_id: canvasId,
          title: input.title ?? workflow.title,
          definition: workflow.definition as Json,
          config_yaml: workflow.config_yaml,
          notes: workflow.notes,
          created_by: user.id
        })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create workflow version')
      }

      return json(
        workflowVersionResponseSchema.parse({
          item: toCanvasWorkflowVersion(data)
        }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
