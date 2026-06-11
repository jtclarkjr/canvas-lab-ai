import { ApiClientError, parseResponse } from '$lib/api-client'
import {
  accessRequestResponseSchema,
  addMemberInputSchema,
  createCanvasInputSchema,
  createCanvasResponseSchema,
  deleteCanvasResponseSchema,
  deleteElementResponseSchema,
  getCanvasResponseSchema,
  listAccessRequestsResponseSchema,
  listCanvasesResponseSchema,
  listElementsResponseSchema,
  listMembersResponseSchema,
  memberResponseSchema,
  myAccessRequestResponseSchema,
  resolveAccessRequestInputSchema,
  updateCanvasInputSchema,
  updateCanvasResponseSchema,
  updateMemberRoleInputSchema,
  upsertElementInputSchema,
  upsertElementResponseSchema,
  userSearchResponseSchema,
  type AccessRequestResponse,
  type AccessRequestStatus,
  type AddMemberInput,
  type CreateCanvasInput,
  type CreateCanvasResponse,
  type DeleteCanvasResponse,
  type DeleteElementResponse,
  type GetCanvasResponse,
  type ListAccessRequestsResponse,
  type ListCanvasesResponse,
  type ListElementsResponse,
  type ListMembersResponse,
  type MemberResponse,
  type MemberRole,
  type MyAccessRequestResponse,
  type ResolveAccessRequestInput,
  type UpdateCanvasInput,
  type UpdateCanvasResponse,
  type UpsertElementInput,
  type UpsertElementResponse,
  type UserSearchResponse
} from '$lib/canvas/schema'
import { getAccessToken } from '$lib/auth/session-service'

export { ApiClientError }

async function getApiHeaders(headers: HeadersInit) {
  const nextHeaders = new Headers(headers)
  const accessToken = await getAccessToken()

  if (accessToken) {
    nextHeaders.set('authorization', `Bearer ${accessToken}`)
  }

  return nextHeaders
}

export async function listCanvases(): Promise<ListCanvasesResponse> {
  const response = await fetch('/api/canvases', {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listCanvasesResponseSchema.parse(payload),
    'Failed to load canvases.'
  )
}

export async function createCanvas(
  input: CreateCanvasInput
): Promise<CreateCanvasResponse> {
  const payload = createCanvasInputSchema.parse(input)

  const response = await fetch('/api/canvases', {
    method: 'POST',
    headers: await getApiHeaders({
      accept: 'application/json',
      'content-type': 'application/json'
    }),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => createCanvasResponseSchema.parse(payload),
    'Failed to create canvas.'
  )
}

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

export async function deleteCanvas(
  id: string
): Promise<DeleteCanvasResponse> {
  const response = await fetch(`/api/canvases/${id}`, {
    method: 'DELETE',
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => deleteCanvasResponseSchema.parse(payload),
    'Failed to delete canvas.'
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
  elementId: string
): Promise<DeleteElementResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/elements/${elementId}`,
    {
      method: 'DELETE',
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => deleteElementResponseSchema.parse(payload),
    'Failed to delete canvas element.'
  )
}

export async function getCanvas(canvasId: string): Promise<GetCanvasResponse> {
  const response = await fetch(`/api/canvases/${canvasId}`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => getCanvasResponseSchema.parse(payload),
    'Failed to load canvas.'
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

export async function requestAccess(
  canvasId: string
): Promise<AccessRequestResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/access-requests`, {
    method: 'POST',
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => accessRequestResponseSchema.parse(payload),
    'Failed to request access.'
  )
}

export async function getMyAccessRequest(
  canvasId: string
): Promise<MyAccessRequestResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/access-requests/me`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => myAccessRequestResponseSchema.parse(payload),
    'Failed to load access request.'
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
