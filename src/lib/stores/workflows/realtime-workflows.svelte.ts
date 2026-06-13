import { supabase } from '$lib/auth/session-store'
import { workflowRowToWorkflow } from '$lib/workflows/mapping'
import { workflowRowSchema, type Workflow } from '$lib/workflows/schema'
import { z } from 'zod'

const deletedWorkflowRowSchema = z.object({ id: z.string() })

type WorkflowSetter = (
  next: Workflow[] | ((previous: Workflow[]) => Workflow[])
) => void

type WorkspaceRealtimeWorkflowsInput = {
  getActiveCanvasId: () => string
  isWorkflowBusy: (workflowId: string) => boolean
  setWorkflows: WorkflowSetter
  onWorkflowDeleted: (workflowId: string) => void
}

export function createWorkspaceRealtimeWorkflowsStore({
  getActiveCanvasId,
  isWorkflowBusy,
  setWorkflows,
  onWorkflowDeleted
}: WorkspaceRealtimeWorkflowsInput) {
  $effect(() => {
    const client = supabase
    const activeCanvasId = getActiveCanvasId()
    if (!client || !activeCanvasId) {
      return
    }

    const channel = client
      .channel(`canvas:${activeCanvasId}:workflows`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_workflows',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = workflowRowSchema.safeParse(payload.new)
          if (!parsed.success) return

          const nextWorkflow = workflowRowToWorkflow(parsed.data)
          setWorkflows((previous) => {
            if (previous.some((workflow) => workflow.id === nextWorkflow.id)) {
              return previous
            }
            return [...previous, nextWorkflow]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_workflows',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = workflowRowSchema.safeParse(payload.new)
          if (!parsed.success) return

          if (isWorkflowBusy(parsed.data.id)) {
            return
          }

          const nextWorkflow = workflowRowToWorkflow(parsed.data)
          setWorkflows((previous) => {
            if (!previous.some((workflow) => workflow.id === nextWorkflow.id)) {
              return [...previous, nextWorkflow]
            }
            return previous.map((workflow) =>
              workflow.id === nextWorkflow.id ? nextWorkflow : workflow
            )
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'canvas_workflows',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => {
          const parsed = deletedWorkflowRowSchema.safeParse(payload.old)
          if (!parsed.success) return

          setWorkflows((previous) =>
            previous.filter((workflow) => workflow.id !== parsed.data.id)
          )
          onWorkflowDeleted(parsed.data.id)
        }
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })
}
