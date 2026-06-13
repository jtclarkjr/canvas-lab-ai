import { json, type RequestHandler } from '@sveltejs/kit'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { toCanvasWorkflow } from '$lib/server/canvas-workflows'
import type { Json } from '$lib/server/database.types'
import {
  assertWorkflowModify,
  requireWorkflow,
  requireWorkflowVersion
} from '$lib/server/workflow-access'
import { handleApiError, withAuth } from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { requireWorkflowsEnabled } from '$lib/server/features'
import { workflowResponseSchema } from '$lib/workflows/schema'

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      requireWorkflowsEnabled()
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId, workflowId, versionId } = event.params

      if (!canvasId || !workflowId || !versionId) {
        return json(
          { message: 'Canvas, workflow, and version ids are required.' },
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
      const version = await requireWorkflowVersion(
        supabase,
        workflow.id,
        versionId
      )

      const { data, error } = await supabase
        .from('canvas_workflows')
        .update({
          definition: version.definition as Json,
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
