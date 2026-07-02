import { apiRequest } from '$lib/api-client'
import {
  assistantThreadResponseSchema,
  chatMessageResponseSchema,
  listAssistantThreadsResponseSchema,
  listAssistantMessagesResponseSchema,
  listChatMembersResponseSchema,
  listChatMessagesResponseSchema,
  sendChatMessageInputSchema,
  updateAssistantThreadInputSchema,
  type AssistantThreadResponse,
  type ChatMessageResponse,
  type ListAssistantThreadsResponse,
  type ListAssistantMessagesResponse,
  type ListChatMembersResponse,
  type ListChatMessagesResponse,
  type SendChatMessageInput,
  type UpdateAssistantThreadInput
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

export async function listAssistantThreads(
  canvasId: string
): Promise<ListAssistantThreadsResponse> {
  return apiRequest(`/api/canvases/${canvasId}/assistant-threads`, {
    parse: (payload) => listAssistantThreadsResponseSchema.parse(payload),
    fallbackMessage: 'Failed to load assistant histories.'
  })
}

export async function listAssistantThreadMessages(
  canvasId: string,
  threadId: string
): Promise<ListAssistantMessagesResponse> {
  return apiRequest(
    `/api/canvases/${canvasId}/assistant-threads/${threadId}/messages`,
    {
      parse: (payload) => listAssistantMessagesResponseSchema.parse(payload),
      fallbackMessage: 'Failed to load assistant messages.'
    }
  )
}

export async function updateAssistantThread(
  canvasId: string,
  threadId: string,
  input: UpdateAssistantThreadInput
): Promise<AssistantThreadResponse> {
  const payload = updateAssistantThreadInputSchema.parse(input)

  return apiRequest(`/api/canvases/${canvasId}/assistant-threads/${threadId}`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    parse: (payload) => assistantThreadResponseSchema.parse(payload),
    fallbackMessage: 'Failed to update assistant history.'
  })
}

export async function deleteAssistantThread(
  canvasId: string,
  threadId: string
): Promise<void> {
  await apiRequest(`/api/canvases/${canvasId}/assistant-threads/${threadId}`, {
    method: 'DELETE',
    parse: () => undefined,
    fallbackMessage: 'Failed to delete assistant history.'
  })
}
