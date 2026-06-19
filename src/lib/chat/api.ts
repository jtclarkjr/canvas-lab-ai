import { apiRequest } from '$lib/api-client'
import {
  chatMessageResponseSchema,
  listAssistantMessagesResponseSchema,
  listChatMembersResponseSchema,
  listChatMessagesResponseSchema,
  sendChatMessageInputSchema,
  type ChatMessageResponse,
  type ListAssistantMessagesResponse,
  type ListChatMembersResponse,
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
  return apiRequest(`/api/canvases/${canvasId}/chat`, {
    parse: (payload) => listChatMessagesResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load chat messages.'
  })
}

export async function sendChatMessage(
  canvasId: string,
  input: SendChatMessageInput
): Promise<ChatMessageResponse> {
  const payload = sendChatMessageInputSchema.parse(input)

  return apiRequest(`/api/canvases/${canvasId}/chat`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    parse: (payload) => chatMessageResponseSchema.parse(payload),
    fallbackMessage: 'Failed to send message.'
  })
}

export async function listChatMembers(
  canvasId: string
): Promise<ListChatMembersResponse> {
  return apiRequest(`/api/canvases/${canvasId}/chat/members`, {
    parse: (payload) => listChatMembersResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load chat members.'
  })
}

export async function listAssistantMessages(
  canvasId: string
): Promise<ListAssistantMessagesResponse> {
  return apiRequest(`/api/canvases/${canvasId}/assistant-messages`, {
    parse: (payload) => listAssistantMessagesResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load assistant messages.'
  })
}
