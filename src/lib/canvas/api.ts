import { ApiClientError, apiRequest } from '$lib/api-client'
import {
  accessRequestResponseSchema,
  createCanvasInputSchema,
  createCanvasResponseSchema,
  deleteCanvasResponseSchema,
  getCanvasResponseSchema,
  listCanvasesResponseSchema,
  myAccessRequestResponseSchema,
  type AccessRequestResponse,
  type CreateCanvasInput,
  type CreateCanvasResponse,
  type DeleteCanvasResponse,
  type GetCanvasResponse,
  type ListCanvasesResponse,
  type MemberRole,
  type MyAccessRequestResponse
} from '$lib/canvas/schema'
export { ApiClientError }

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

export async function listCanvases(): Promise<ListCanvasesResponse> {
  return apiRequest('/api/canvases', {
    parse: (payload) => listCanvasesResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load canvases.'
  })
}

export async function createCanvas(
  input: CreateCanvasInput
): Promise<CreateCanvasResponse> {
  const payload = createCanvasInputSchema.parse(input)

  return apiRequest('/api/canvases', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    parse: (payload) => createCanvasResponseSchema.parse(payload),
    fallbackMessage: 'Failed to create canvas.'
  })
}

export async function deleteCanvas(id: string): Promise<DeleteCanvasResponse> {
  return apiRequest(`/api/canvases/${id}`, {
    method: 'DELETE',
    parse: (payload) => deleteCanvasResponseSchema.parse(payload),
    fallbackMessage: 'Failed to delete canvas.'
  })
}

export async function getCanvas(canvasId: string): Promise<GetCanvasResponse> {
  return apiRequest(`/api/canvases/${canvasId}`, {
    parse: (payload) => getCanvasResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load canvas.'
  })
}

export async function requestAccess(
  canvasId: string,
  requestedRole?: MemberRole
): Promise<AccessRequestResponse> {
  return apiRequest(`/api/canvases/${canvasId}/access-requests`, {
    method: 'POST',
    headers: requestedRole ? jsonHeaders : undefined,
    ...(requestedRole ? { body: JSON.stringify({ requestedRole }) } : {}),
    parse: (payload) => accessRequestResponseSchema.parse(payload),
    fallbackMessage: 'Failed to request access.'
  })
}

export async function getMyAccessRequest(
  canvasId: string
): Promise<MyAccessRequestResponse> {
  return apiRequest(`/api/canvases/${canvasId}/access-requests/me`, {
    parse: (payload) => myAccessRequestResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load access request.'
  })
}
