import { getApiHeaders, parseResponse } from '$lib/api-client'
import {
  chatMessageResponseSchema,
  listAssistantMessagesResponseSchema,
  listChatMessagesResponseSchema,
  sendChatMessageInputSchema,
  type ChatMessageResponse,
  type ListAssistantMessagesResponse,
  type ListChatMessagesResponse,
  type SendChatMessageInput
} from '$lib/chat/schema'

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

export async function listChatMessages(
  canvasId: string
): Promise<ListChatMessagesResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/chat`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listChatMessagesResponseSchema.parse(payload),
    'Failed to load chat messages.'
  )
}

export async function sendChatMessage(
  canvasId: string,
  input: SendChatMessageInput
): Promise<ChatMessageResponse> {
  const payload = sendChatMessageInputSchema.parse(input)

  const response = await fetch(`/api/canvases/${canvasId}/chat`, {
    method: 'POST',
    headers: await getApiHeaders(jsonHeaders),
    body: JSON.stringify(payload)
  })

  return parseResponse(
    response,
    (payload) => chatMessageResponseSchema.parse(payload),
    'Failed to send message.'
  )
}

export async function listAssistantMessages(
  canvasId: string
): Promise<ListAssistantMessagesResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/assistant-messages`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => listAssistantMessagesResponseSchema.parse(payload),
    'Failed to load assistant messages.'
  )
}
