import type { WorkflowRow, WorkflowVersionRow } from '$lib/workflows/schema'

export const workflowRowToWorkflow = (row: WorkflowRow) => ({
  id: row.id,
  canvasId: row.canvas_id,
  title: row.title,
  x: row.x,
  y: row.y,
  width: row.width,
  height: row.height,
  rotation: row.rotation,
  definition: row.definition,
  configYaml: row.config_yaml,
  notes: row.notes,
  settings: row.settings,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const workflowVersionRowToVersion = (row: WorkflowVersionRow) => ({
  id: row.id,
  workflowId: row.workflow_id,
  canvasId: row.canvas_id,
  title: row.title,
  definition: row.definition,
  configYaml: row.config_yaml,
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: row.created_at
})
