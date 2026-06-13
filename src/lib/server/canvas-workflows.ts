import type { SupabaseClient } from '@supabase/supabase-js'
import {
  workflowRowToWorkflow,
  workflowVersionRowToVersion
} from '$lib/workflows/mapping'
import {
  listWorkflowVersionsResponseSchema,
  listWorkflowsResponseSchema,
  workflowRowSchema,
  workflowVersionRowSchema,
  type ListWorkflowVersionsResponse,
  type ListWorkflowsResponse,
  type Workflow,
  type WorkflowRow,
  type WorkflowVersion,
  type WorkflowVersionRow
} from '$lib/workflows/schema'
import type { Database } from '$lib/server/database.types'

export function toCanvasWorkflow(row: unknown): Workflow {
  return workflowRowToWorkflow(workflowRowSchema.parse(row))
}

export function toCanvasWorkflowVersion(row: unknown): WorkflowVersion {
  return workflowVersionRowToVersion(workflowVersionRowSchema.parse(row))
}

export async function listCanvasWorkflowsForCanvas(
  supabase: SupabaseClient<Database>,
  canvasId: string
): Promise<ListWorkflowsResponse> {
  const { data, error } = await supabase
    .from('canvas_workflows')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return listWorkflowsResponseSchema.parse({
    items: (data ?? []).map(toCanvasWorkflow)
  })
}

export async function listCanvasWorkflowVersions(
  supabase: SupabaseClient<Database>,
  workflowId: string
): Promise<ListWorkflowVersionsResponse> {
  const { data, error } = await supabase
    .from('canvas_workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return listWorkflowVersionsResponseSchema.parse({
    items: (data ?? []).map(toCanvasWorkflowVersion)
  })
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const definition = {
    version: 1 as const,
    name: 'Workflow',
    description: '',
    steps: [
      {
        id: 'input',
        title: 'Input',
        type: 'input' as const,
        description: '',
        needs: [],
        input: {},
        config: {},
        action: { kind: 'none', config: {} },
        position: { x: 0, y: 0 }
      }
    ]
  }

  const settings = {
    context: {
      documentIds: [],
      sceneIds: [],
      includeLinkedScenes: true
    }
  }

  const row = (overrides: Partial<WorkflowRow> = {}): WorkflowRow => ({
    id: 'workflow-1',
    canvas_id: 'canvas-1',
    title: 'Workflow',
    x: 10,
    y: 20,
    width: 720,
    height: 480,
    rotation: 0,
    definition,
    config_yaml: 'version: 1',
    notes: '',
    settings,
    created_by: 'user-1',
    updated_by: 'user-2',
    created_at: '2026-06-13T00:00:00.000Z',
    updated_at: '2026-06-13T00:00:01.000Z',
    ...overrides
  })

  const versionRow = (
    overrides: Partial<WorkflowVersionRow> = {}
  ): WorkflowVersionRow => ({
    id: 'version-1',
    workflow_id: 'workflow-1',
    canvas_id: 'canvas-1',
    title: 'Snapshot',
    definition,
    config_yaml: 'version: 1',
    notes: '',
    created_by: 'user-1',
    created_at: '2026-06-13T00:00:02.000Z',
    ...overrides
  })

  describe('canvas workflow server helpers', () => {
    it('maps workflow rows to API workflows', () => {
      expect(toCanvasWorkflow(row())).toEqual({
        id: 'workflow-1',
        canvasId: 'canvas-1',
        title: 'Workflow',
        x: 10,
        y: 20,
        width: 720,
        height: 480,
        rotation: 0,
        definition,
        configYaml: 'version: 1',
        notes: '',
        settings,
        createdBy: 'user-1',
        updatedBy: 'user-2',
        createdAt: '2026-06-13T00:00:00.000Z',
        updatedAt: '2026-06-13T00:00:01.000Z'
      })
    })

    it('maps workflow version rows to snapshots', () => {
      expect(toCanvasWorkflowVersion(versionRow())).toEqual({
        id: 'version-1',
        workflowId: 'workflow-1',
        canvasId: 'canvas-1',
        title: 'Snapshot',
        definition,
        configYaml: 'version: 1',
        notes: '',
        createdBy: 'user-1',
        createdAt: '2026-06-13T00:00:02.000Z'
      })
    })
  })
}
