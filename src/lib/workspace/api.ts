import { getApiHeaders, parseResponse } from '#lib/api-client.js'
import {
  addMemberInputSchema,
  deleteElementResponseSchema,
  listAccessRequestsResponseSchema,
  listCanvasHistoryResponseSchema,
  listElementsResponseSchema,
  listMembersResponseSchema,
  memberResponseSchema,
  resolveAccessRequestInputSchema,
  updateCanvasInputSchema,
  updateCanvasResponseSchema,
  updateMemberRoleInputSchema,
  upsertElementInputSchema,
  upsertElementResponseSchema,
  userSearchResponseSchema,
  type AddMemberInput,
  type CanvasMutationAuditInput,
  type DeleteElementResponse,
  type ListCanvasHistoryResponse,
  type ListAccessRequestsResponse,
  type ListElementsResponse,
  type ListMembersResponse,
  type MemberResponse,
  type ResolveAccessRequestInput,
  type UpdateCanvasInput,
  type UpdateCanvasResponse,
  type UpsertElementInput,
  type UpsertElementResponse,
  type UserSearchResponse
} from '#lib/workspace/schema.js'
import {
  accessRequestResponseSchema,
  type AccessRequestResponse,
  type AccessRequestStatus,
  type MemberRole
} from '#lib/canvas/schema.js'

export async function updateCanvas(
  id: string,
  input: UpdateCanvasInput
): Promise<UpdateCanvasResponse> {
  const payload = updateCanvasInputSchema.parse(input)

  const response = await fetch(`/api/canvases/${id}`, {
    method: 'PATCH',
    headers: await getApiHeaders({
      accept: 'application/json',
      'content-type': 'application/json'
    }),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => updateCanvasResponseSchema.parse(payload),
    'Failed to update canvas.'
  )
}

export async function listElements(
  canvasId: string
): Promise<ListElementsResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/elements`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listElementsResponseSchema.parse(payload),
    'Failed to load canvas elements.'
  )
}

export async function upsertElement(
  input: UpsertElementInput
): Promise<UpsertElementResponse> {
  const payload = upsertElementInputSchema.parse(input)

  const response = await fetch(`/api/canvases/${payload.canvasId}/elements`, {
    method: 'POST',
    headers: await getApiHeaders({
      accept: 'application/json',
      'content-type': 'application/json'
    }),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => upsertElementResponseSchema.parse(payload),
    'Failed to save canvas element.'
  )
}

export async function deleteElement(
  canvasId: string,
  elementId: string,
  audit?: CanvasMutationAuditInput
): Promise<DeleteElementResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/elements/${elementId}`,
    {
      method: 'DELETE',
      headers: await getApiHeaders({
        accept: 'application/json',
        ...(audit ? { 'content-type': 'application/json' } : {})
      }),
      ...(audit ? { body: JSON.stringify({ audit }) } : {})
    }
  )

  return parseResponse(
    response,
    (payload) => deleteElementResponseSchema.parse(payload),
    'Failed to delete canvas element.'
  )
}

export async function listCanvasHistory(
  canvasId: string,
  options: { limit?: number; before?: string | null } = {}
): Promise<ListCanvasHistoryResponse> {
  const params = new URLSearchParams()
  if (options.limit) {
    params.set('limit', String(options.limit))
  }
  if (options.before) {
    params.set('before', options.before)
  }
  const query = params.toString()
  const response = await fetch(
    `/api/canvases/${canvasId}/history${query ? `?${query}` : ''}`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => listCanvasHistoryResponseSchema.parse(payload),
    'Failed to load canvas history.'
  )
}

export async function searchUsers(query: string): Promise<UserSearchResponse> {
  const response = await fetch(
    `/api/users/search?q=${encodeURIComponent(query)}`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => userSearchResponseSchema.parse(payload),
    'Failed to search users.'
  )
}

export async function listMembers(
  canvasId: string
): Promise<ListMembersResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/members`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listMembersResponseSchema.parse(payload),
    'Failed to load members.'
  )
}

export async function addMember(
  canvasId: string,
  input: AddMemberInput
): Promise<MemberResponse> {
  const payload = addMemberInputSchema.parse(input)

  const response = await fetch(`/api/canvases/${canvasId}/members`, {
    method: 'POST',
    headers: await getApiHeaders({
      accept: 'application/json',
      'content-type': 'application/json'
    }),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => memberResponseSchema.parse(payload),
    'Failed to add member.'
  )
}

export async function updateMemberRole(
  canvasId: string,
  userId: string,
  role: MemberRole
): Promise<MemberResponse> {
  const payload = updateMemberRoleInputSchema.parse({ role })

  const response = await fetch(`/api/canvases/${canvasId}/members/${userId}`, {
    method: 'PATCH',
    headers: await getApiHeaders({
      accept: 'application/json',
      'content-type': 'application/json'
    }),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => memberResponseSchema.parse(payload),
    'Failed to update member role.'
  )
}

export async function removeMember(
  canvasId: string,
  userId: string
): Promise<void> {
  const response = await fetch(`/api/canvases/${canvasId}/members/${userId}`, {
    method: 'DELETE',
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  await parseResponse(
    response,
    (payload) => payload,
    'Failed to remove member.'
  )
}

export async function listAccessRequests(
  canvasId: string,
  status: AccessRequestStatus = 'pending'
): Promise<ListAccessRequestsResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/access-requests?status=${status}`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => listAccessRequestsResponseSchema.parse(payload),
    'Failed to load access requests.'
  )
}

export async function resolveAccessRequest(
  canvasId: string,
  requestId: string,
  input: ResolveAccessRequestInput
): Promise<AccessRequestResponse> {
  const payload = resolveAccessRequestInputSchema.parse(input)

  const response = await fetch(
    `/api/canvases/${canvasId}/access-requests/${requestId}`,
    {
      method: 'PATCH',
      headers: await getApiHeaders({
        accept: 'application/json',
        'content-type': 'application/json'
      }),
      body: JSON.stringify(payload)
    }
  )

  return parseResponse(
    response,
    (payload) => accessRequestResponseSchema.parse(payload),
    'Failed to resolve access request.'
  )
}
