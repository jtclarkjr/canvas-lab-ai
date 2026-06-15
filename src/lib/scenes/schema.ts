import { z } from 'zod'
import type { UIMessage } from 'ai'
import type { Path, TextElement } from '$lib/canvas/types'

// ── scenes ──────────────────────────────────────────────────────────────

export const sceneRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  type: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  settings: z.record(z.string(), z.unknown()),
  created_by: z.string().nullable(),
  updated_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export const sceneSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  type: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  settings: z.record(z.string(), z.unknown()),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const sceneTitleSchema = z
  .string()
  .trim()
  .max(120, 'Keep scene titles under 120 characters.')

export const createSceneInputSchema = z.object({
  type: z.string().min(1).default('document'),
  title: sceneTitleSchema.optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(160).max(2000).optional(),
  height: z.number().min(120).max(2000).optional(),
  rotation: z.number().optional(),
  settings: z.record(z.string(), z.unknown()).optional()
})

export const updateSceneInputSchema = z
  .object({
    type: z.string().min(1),
    title: sceneTitleSchema,
    x: z.number(),
    y: z.number(),
    width: z.number().min(160).max(2000),
    height: z.number().min(120).max(2000),
    rotation: z.number(),
    settings: z.record(z.string(), z.unknown())
  })
  .partial()

export const sceneResponseSchema = z.object({ item: sceneSchema })
export const listScenesResponseSchema = z.object({
  items: z.array(sceneSchema)
})

// ── scene documents (drafts + saved library) ────────────────────────────

export const sceneDocumentStatusSchema = z.enum(['draft', 'saved'])

export const sceneDocumentRowSchema = z.object({
  id: z.string(),
  scene_id: z.string(),
  canvas_id: z.string(),
  kind: z.string(),
  status: sceneDocumentStatusSchema,
  title: z.string(),
  content: z.record(z.string(), z.unknown()),
  created_by: z.string().nullable(),
  updated_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
})

export const sceneDocumentListItemRowSchema = sceneDocumentRowSchema.omit({
  content: true
})

export const sceneDocumentSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  canvasId: z.string(),
  kind: z.string(),
  status: sceneDocumentStatusSchema,
  title: z.string(),
  content: z.record(z.string(), z.unknown()),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const sceneDocumentListItemSchema = sceneDocumentSchema.omit({
  content: true
})

export const documentTitleSchema = z
  .string()
  .trim()
  .max(200, 'Keep document titles under 200 characters.')

export const createSceneDocumentInputSchema = z.object({
  kind: z.string().min(1).default('markdown'),
  status: sceneDocumentStatusSchema.default('draft'),
  title: documentTitleSchema.default(''),
  content: z.record(z.string(), z.unknown()).default({})
})

export const updateSceneDocumentInputSchema = z
  .object({
    title: documentTitleSchema,
    status: sceneDocumentStatusSchema,
    content: z.record(z.string(), z.unknown())
  })
  .partial()

export const sceneDocumentResponseSchema = z.object({
  item: sceneDocumentSchema
})
export const listSceneDocumentsResponseSchema = z.object({
  items: z.array(sceneDocumentSchema)
})
export const listSceneDocumentItemsResponseSchema = z.object({
  items: z.array(sceneDocumentListItemSchema)
})

export const pathSchema: z.ZodType<Path> = z.looseObject({
  id: z.string(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  color: z.string(),
  width: z.number(),
  opacity: z.number(),
  z: z.number().nullable().optional()
})

export const textElementSchema: z.ZodType<TextElement> = z.looseObject({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional(),
  color: z.string(),
  fontSize: z.number(),
  isBold: z.boolean(),
  isItalic: z.boolean(),
  isUnderline: z.boolean(),
  z: z.number().nullable().optional()
})

export const documentAnnotationsSchema = z.object({
  paths: z.array(pathSchema).default([]),
  textElements: z.array(textElementSchema).default([])
})

// Markdown document content payload. Annotations (the notes view's drawing
// layer) live alongside the markdown so they travel with the document.
export const markdownDocumentContentSchema = z.object({
  docType: z.string().optional(),
  markdown: z.string().default(''),
  annotations: documentAnnotationsSchema.optional()
})

// ── scene chat messages ─────────────────────────────────────────────────

export const sceneMessageRoleSchema = z.enum(['user', 'assistant', 'system'])

export const sceneMessageRowSchema = z.object({
  id: z.string(),
  scene_id: z.string(),
  canvas_id: z.string(),
  document_id: z.string().nullable().optional(),
  role: sceneMessageRoleSchema,
  parts: z.custom<UIMessage['parts']>(() => true),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_by: z.string().nullable(),
  created_at: z.string()
})

export const messageAuthorSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const sceneMessageSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  documentId: z.string().nullable().optional(),
  role: sceneMessageRoleSchema,
  parts: z.custom<UIMessage['parts']>(() => true),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  author: messageAuthorSchema.nullable().optional(),
  createdBy: z.string().nullable().optional(),
  createdAt: z.string().optional()
})

export const listSceneMessagesResponseSchema = z.object({
  items: z.array(sceneMessageSchema)
})

// ── AI document chat request ────────────────────────────────────────────

// UIMessages are validated loosely: the AI SDK owns their internal shape.
export const uiMessageSchema = z.looseObject({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.custom<UIMessage['parts']>(() => true)
})

export const documentChatRequestSchema = z.object({
  canvasId: z.string().min(1),
  sceneId: z.string().min(1),
  documentId: z.string().min(1),
  contextDocumentIds: z.array(z.string()).max(10).default([]),
  modelId: z.string().min(1),
  category: z.string().min(1),
  webSearch: z.boolean().default(false),
  messages: z.array(uiMessageSchema).min(1)
})

// ── inferred types ──────────────────────────────────────────────────────

export type SceneRow = z.infer<typeof sceneRowSchema>
export type Scene = z.infer<typeof sceneSchema>
export type CreateSceneInput = z.infer<typeof createSceneInputSchema>
export type UpdateSceneInput = z.infer<typeof updateSceneInputSchema>
export type SceneResponse = z.infer<typeof sceneResponseSchema>
export type ListScenesResponse = z.infer<typeof listScenesResponseSchema>
export type SceneDocumentStatus = z.infer<typeof sceneDocumentStatusSchema>
export type SceneDocumentRow = z.infer<typeof sceneDocumentRowSchema>
export type SceneDocumentListItemRow = z.infer<
  typeof sceneDocumentListItemRowSchema
>
export type SceneDocument = z.infer<typeof sceneDocumentSchema>
export type SceneDocumentListItem = z.infer<typeof sceneDocumentListItemSchema>
export type CreateSceneDocumentInput = z.infer<
  typeof createSceneDocumentInputSchema
>
export type UpdateSceneDocumentInput = z.infer<
  typeof updateSceneDocumentInputSchema
>
export type SceneDocumentResponse = z.infer<typeof sceneDocumentResponseSchema>
export type ListSceneDocumentsResponse = z.infer<
  typeof listSceneDocumentsResponseSchema
>
export type ListSceneDocumentItemsResponse = z.infer<
  typeof listSceneDocumentItemsResponseSchema
>
export type MarkdownDocumentContent = z.infer<
  typeof markdownDocumentContentSchema
>
export type DocumentAnnotations = z.infer<typeof documentAnnotationsSchema>
export type SceneMessageRow = z.infer<typeof sceneMessageRowSchema>
export type SceneMessage = z.infer<typeof sceneMessageSchema>
export type MessageAuthor = z.infer<typeof messageAuthorSchema>
export type ListSceneMessagesResponse = z.infer<
  typeof listSceneMessagesResponseSchema
>
export type DocumentChatRequest = z.infer<typeof documentChatRequestSchema>
