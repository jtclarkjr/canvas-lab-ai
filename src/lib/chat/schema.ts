import { z } from 'zod'
import type { UIMessage } from 'ai'
import { messageAuthorSchema, uiMessageSchema } from '$lib/scenes/schema'

// canvas chat messages (member chatroom)

// Parses both API rows and realtime postgres_changes payloads.
export const chatMessageRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_by: z.string().nullable(),
  created_at: z.string()
})

export const chatMessageSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  content: z.string(),
  author: messageAuthorSchema.nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string()
})

export const sendChatMessageInputSchema = z.object({
  id: z.uuid(),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(4000, 'Keep messages under 4000 characters.')
})

export const chatMessageResponseSchema = z.object({ item: chatMessageSchema })
export const listChatMessagesResponseSchema = z.object({
  items: z.array(chatMessageSchema)
})

export function chatMessageRowToMessage(
  row: ChatMessageRow,
  authorName?: string | null
): ChatMessage {
  const metadataAuthor = messageAuthorSchema
    .nullable()
    .catch(null)
    .parse(row.metadata?.author ?? null)

  const author =
    authorName && row.created_by
      ? { id: row.created_by, name: authorName }
      : metadataAuthor

  return {
    id: row.id,
    canvasId: row.canvas_id,
    content: row.content,
    author,
    createdBy: row.created_by,
    createdAt: row.created_at
  }
}

// canvas assistant (per-user AI thread)

export const assistantThreadTitleSchema = z
  .string()
  .trim()
  .min(1, 'Title cannot be empty.')
  .max(80, 'Keep titles under 80 characters.')

export const assistantThreadSchema = z.object({
  id: z.uuid(),
  canvasId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const assistantThreadRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string()
})

export const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.custom<UIMessage['parts']>(() => true),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().optional()
})

export const listAssistantMessagesResponseSchema = z.object({
  items: z.array(assistantMessageSchema)
})

export const listAssistantThreadsResponseSchema = z.object({
  items: z.array(assistantThreadSchema)
})

export const updateAssistantThreadInputSchema = z.object({
  title: assistantThreadTitleSchema
})

export const assistantThreadResponseSchema = z.object({
  item: assistantThreadSchema
})

export const canvasAssistantRequestSchema = z.object({
  canvasId: z.string().min(1),
  threadId: z.uuid().optional(),
  modelId: z.string().min(1),
  webSearch: z.boolean().default(true),
  messages: z.array(uiMessageSchema).min(1)
})

export function assistantThreadRowToThread(
  row: AssistantThreadRow
): AssistantThread {
  return {
    id: row.id,
    canvasId: row.canvas_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const listChatMembersResponseSchema = z.object({
  items: z.array(messageAuthorSchema)
})

export type ListChatMembersResponse = z.infer<
  typeof listChatMembersResponseSchema
>

export type ChatMessageRow = z.infer<typeof chatMessageRowSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type SendChatMessageInput = z.infer<typeof sendChatMessageInputSchema>
export type ChatMessageResponse = z.infer<typeof chatMessageResponseSchema>
export type ListChatMessagesResponse = z.infer<
  typeof listChatMessagesResponseSchema
>
export type AssistantMessage = z.infer<typeof assistantMessageSchema>
export type ListAssistantMessagesResponse = z.infer<
  typeof listAssistantMessagesResponseSchema
>
export type AssistantThread = z.infer<typeof assistantThreadSchema>
export type AssistantThreadRow = z.infer<typeof assistantThreadRowSchema>
export type ListAssistantThreadsResponse = z.infer<
  typeof listAssistantThreadsResponseSchema
>
export type UpdateAssistantThreadInput = z.infer<
  typeof updateAssistantThreadInputSchema
>
export type AssistantThreadResponse = z.infer<
  typeof assistantThreadResponseSchema
>
export type CanvasAssistantRequest = z.infer<
  typeof canvasAssistantRequestSchema
>
