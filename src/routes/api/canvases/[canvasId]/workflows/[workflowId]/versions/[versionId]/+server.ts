import { json, type RequestHandler } from '@sveltejs/kit'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { toCanvasWorkflow } from '$lib/server/canvas-workflows'
import {
  assertWorkflowModify,
  requireWorkflow,
  requireWorkflowVersion
} from '$lib/server/workflow-access'
import {
  handleApiError,
  requireRouteParam,
  withAccountAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { requireWorkflowsEnabled } from '$lib/server/features'
import { toDbJson } from '$lib/server/json'
import { workflowResponseSchema } from '$lib/workflows/schema'

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
      const workflowId = requireRouteParam(
        event.params.workflowId,
        'Workflow id',
        'workflowId'
      )
      const versionId = requireRouteParam(
        event.params.versionId,
        'Version id',
        'versionId'
      )

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const workflow = await requireWorkflow(supabase, canvasId, workflowId)
      assertWorkflowModify(role, workflow, user.id)
      const version = await requireWorkflowVersion(
        supabase,
        workflow.id,
        versionId
      )

      const { data, error } = await supabase
        .from('canvas_workflows')
        .update({
          definition: toDbJson(version.definition),
          config_yaml: version.config_yaml,
          notes: version.notes,
          updated_by: user.id
        })
        .eq('id', workflow.id)
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to restore workflow version')
      }

      return json(
        workflowResponseSchema.parse({ item: toCanvasWorkflow(data) })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
