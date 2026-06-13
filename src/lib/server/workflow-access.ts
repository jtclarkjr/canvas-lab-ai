import type { SupabaseClient } from '@supabase/supabase-js'
import type { CanvasRole } from '$lib/canvas/roles'
import { forbidden, notFound } from '$lib/server/api-error'
import type { Database } from '$lib/server/database.types'

type WorkflowRow = Database['public']['Tables']['canvas_workflows']['Row']
type WorkflowVersionRow =
  Database['public']['Tables']['canvas_workflow_versions']['Row']

export async function requireWorkflow(
  supabase: SupabaseClient<Database>,
  canvasId: string,
  workflowId: string
): Promise<WorkflowRow> {
  const { data, error } = await supabase
    .from('canvas_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.canvas_id !== canvasId) {
    throw notFound('Workflow not found.', {
      code: 'workflow_not_found',
      details: { workflowId }
    })
  }

  return data
}

export function assertWorkflowModify(
  role: CanvasRole,
  workflow: WorkflowRow,
  userId: string
) {
  if (role === 'editor' && workflow.created_by !== userId) {
    throw forbidden('You can only modify workflows you created.', {
      code: 'workflow_forbidden',
      details: { workflowId: workflow.id }
    })
  }
}

export async function requireWorkflowVersion(
  supabase: SupabaseClient<Database>,
  workflowId: string,
  versionId: string
): Promise<WorkflowVersionRow> {
  const { data, error } = await supabase
    .from('canvas_workflow_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data || data.workflow_id !== workflowId) {
    throw notFound('Workflow version not found.', {
      code: 'workflow_version_not_found',
      details: { workflowId, versionId }
    })
  }

  return data
}
