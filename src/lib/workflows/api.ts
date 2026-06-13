import { getApiHeaders, parseResponse } from '$lib/api-client'
import {
  createWorkflowInputSchema,
  createWorkflowVersionInputSchema,
  listWorkflowVersionsResponseSchema,
  listWorkflowsResponseSchema,
  updateWorkflowInputSchema,
  workflowAssistantRequestSchema,
  workflowAssistantResponseSchema,
  workflowResponseSchema,
  workflowVersionResponseSchema,
  type CreateWorkflowInput,
  type CreateWorkflowVersionInput,
  type ListWorkflowVersionsResponse,
  type ListWorkflowsResponse,
  type UpdateWorkflowInput,
  type WorkflowAssistantRequest,
  type WorkflowAssistantResponse,
  type WorkflowResponse,
  type WorkflowVersionResponse
} from '$lib/workflows/schema'

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

export async function listWorkflows(
  canvasId: string
): Promise<ListWorkflowsResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/workflows`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listWorkflowsResponseSchema.parse(payload),
    'Failed to load workflows.'
  )
}

export async function createWorkflow(
  canvasId: string,
  input: CreateWorkflowInput
): Promise<WorkflowResponse> {
  const payload = createWorkflowInputSchema.parse(input)
  const response = await fetch(`/api/canvases/${canvasId}/workflows`, {
    method: 'POST',
    headers: await getApiHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => workflowResponseSchema.parse(payload),
    'Failed to create workflow.'
  )
}

export async function updateWorkflow(
  canvasId: string,
  workflowId: string,
  input: UpdateWorkflowInput
): Promise<WorkflowResponse> {
  const payload = updateWorkflowInputSchema.parse(input)
  const response = await fetch(
    `/api/canvases/${canvasId}/workflows/${workflowId}`,
    {
      method: 'PATCH',
      headers: await getApiHeaders(jsonHeaders),
      body: JSON.stringify(payload)
    }
  )

  return parseResponse(
    response,
    (payload) => workflowResponseSchema.parse(payload),
    'Failed to update workflow.'
  )
}

export async function deleteWorkflow(
  canvasId: string,
  workflowId: string
): Promise<WorkflowResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/workflows/${workflowId}`,
    {
      method: 'DELETE',
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => workflowResponseSchema.parse(payload),
    'Failed to delete workflow.'
  )
}

export async function listWorkflowVersions(
  canvasId: string,
  workflowId: string
): Promise<ListWorkflowVersionsResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/workflows/${workflowId}/versions`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => listWorkflowVersionsResponseSchema.parse(payload),
    'Failed to load workflow versions.'
  )
}

export async function createWorkflowVersion(
  canvasId: string,
  workflowId: string,
  input: CreateWorkflowVersionInput = {}
): Promise<WorkflowVersionResponse> {
  const payload = createWorkflowVersionInputSchema.parse(input)
  const response = await fetch(
    `/api/canvases/${canvasId}/workflows/${workflowId}/versions`,
    {
      method: 'POST',
      headers: await getApiHeaders(jsonHeaders),
      body: JSON.stringify(payload)
    }
  )

  return parseResponse(
    response,
    (payload) => workflowVersionResponseSchema.parse(payload),
    'Failed to save workflow version.'
  )
}

export async function restoreWorkflowVersion(
  canvasId: string,
  workflowId: string,
  versionId: string
): Promise<WorkflowResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/workflows/${workflowId}/versions/${versionId}`,
    {
      method: 'POST',
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => workflowResponseSchema.parse(payload),
    'Failed to restore workflow version.'
  )
}

export async function requestWorkflowAssistant(
  input: WorkflowAssistantRequest
): Promise<WorkflowAssistantResponse> {
  const payload = workflowAssistantRequestSchema.parse(input)
  const response = await fetch('/api/ai/workflow-assistant', {
    method: 'POST',
    headers: await getApiHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => workflowAssistantResponseSchema.parse(payload),
    'Failed to ask workflow assistant.'
  )
}
