import { z } from 'zod'
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

export const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(z.unknown()),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().optional()
})

export const listAssistantMessagesResponseSchema = z.object({
  items: z.array(assistantMessageSchema)
})

export const canvasAssistantRequestSchema = z.object({
  canvasId: z.string().min(1),
  modelId: z.string().min(1),
  webSearch: z.boolean().default(true),
  messages: z.array(uiMessageSchema).min(1)
})

export const chatMemberSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const listChatMembersResponseSchema = z.object({
  items: z.array(chatMemberSchema)
})

export type ChatMember = z.infer<typeof chatMemberSchema>
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
export type CanvasAssistantRequest = z.infer<
  typeof canvasAssistantRequestSchema
>
