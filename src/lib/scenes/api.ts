import { getApiHeaders, parseResponse } from '$lib/api-client'
import {
  createSceneDocumentInputSchema,
  createSceneInputSchema,
  listSceneDocumentsResponseSchema,
  listSceneMessagesResponseSchema,
  listScenesResponseSchema,
  sceneDocumentResponseSchema,
  sceneResponseSchema,
  updateSceneDocumentInputSchema,
  updateSceneInputSchema,
  type CreateSceneDocumentInput,
  type CreateSceneInput,
  type ListSceneDocumentsResponse,
  type ListSceneMessagesResponse,
  type ListScenesResponse,
  type SceneDocumentResponse,
  type SceneDocumentStatus,
  type SceneResponse,
  type UpdateSceneDocumentInput,
  type UpdateSceneInput
} from '$lib/scenes/schema'

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

export async function listScenes(canvasId: string): Promise<ListScenesResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/scenes`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listScenesResponseSchema.parse(payload),
    'Failed to load scenes.'
  )
}

export async function createScene(
  canvasId: string,
  input: CreateSceneInput
): Promise<SceneResponse> {
  const payload = createSceneInputSchema.parse(input)

  const response = await fetch(`/api/canvases/${canvasId}/scenes`, {
    method: 'POST',
    headers: await getApiHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => sceneResponseSchema.parse(payload),
    'Failed to create scene.'
  )
}

export async function updateScene(
  canvasId: string,
  sceneId: string,
  input: UpdateSceneInput
): Promise<SceneResponse> {
  const payload = updateSceneInputSchema.parse(input)

  const response = await fetch(`/api/canvases/${canvasId}/scenes/${sceneId}`, {
    method: 'PATCH',
    headers: await getApiHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => sceneResponseSchema.parse(payload),
    'Failed to update scene.'
  )
}

export async function deleteScene(
  canvasId: string,
  sceneId: string
): Promise<SceneResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/scenes/${sceneId}`, {
    method: 'DELETE',
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => sceneResponseSchema.parse(payload),
    'Failed to delete scene.'
  )
}

export async function listSceneDocuments(
  canvasId: string,
  sceneId: string,
  status?: SceneDocumentStatus
): Promise<ListSceneDocumentsResponse> {
  const query = status ? `?status=${status}` : ''
  const response = await fetch(
    `/api/canvases/${canvasId}/scenes/${sceneId}/documents${query}`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => listSceneDocumentsResponseSchema.parse(payload),
    'Failed to load scene documents.'
  )
}

export async function createSceneDocument(
  canvasId: string,
  sceneId: string,
  input: CreateSceneDocumentInput
): Promise<SceneDocumentResponse> {
  const payload = createSceneDocumentInputSchema.parse(input)

  const response = await fetch(
    `/api/canvases/${canvasId}/scenes/${sceneId}/documents`,
    {
      method: 'POST',
      headers: await getApiHeaders(jsonHeaders),
      body: JSON.stringify(payload)
    }
  )

  return parseResponse(
    response,
    (payload) => sceneDocumentResponseSchema.parse(payload),
    'Failed to create document.'
  )
}

export async function getSceneDocument(
  canvasId: string,
  sceneId: string,
  documentId: string
): Promise<SceneDocumentResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/scenes/${sceneId}/documents/${documentId}`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => sceneDocumentResponseSchema.parse(payload),
    'Failed to load document.'
  )
}

export async function updateSceneDocument(
  canvasId: string,
  sceneId: string,
  documentId: string,
  input: UpdateSceneDocumentInput
): Promise<SceneDocumentResponse> {
  const payload = updateSceneDocumentInputSchema.parse(input)

  const response = await fetch(
    `/api/canvases/${canvasId}/scenes/${sceneId}/documents/${documentId}`,
    {
      method: 'PATCH',
      headers: await getApiHeaders(jsonHeaders),
      body: JSON.stringify(payload)
    }
  )

  return parseResponse(
    response,
    (payload) => sceneDocumentResponseSchema.parse(payload),
    'Failed to update document.'
  )
}

export async function deleteSceneDocument(
  canvasId: string,
  sceneId: string,
  documentId: string
): Promise<SceneDocumentResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/scenes/${sceneId}/documents/${documentId}`,
    {
      method: 'DELETE',
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => sceneDocumentResponseSchema.parse(payload),
    'Failed to delete document.'
  )
}

export async function listSceneMessages(
  canvasId: string,
  sceneId: string,
  documentId?: string
): Promise<ListSceneMessagesResponse> {
  const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : ''
  const response = await fetch(
    `/api/canvases/${canvasId}/scenes/${sceneId}/messages${query}`,
    {
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => listSceneMessagesResponseSchema.parse(payload),
    'Failed to load scene messages.'
  )
}
