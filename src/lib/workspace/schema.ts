import { z } from 'zod'
import {
  accessRequestSchema,
  canvasSchema,
  canvasVisibilitySchema,
  createCanvasInputSchema,
  memberRoleSchema,
  roleSchema,
  userSearchResultSchema
} from '#lib/canvas/schema.js'

export const canvasElementRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).nullable(),
  x: z.number(),
  y: z.number(),
  z: z.number().nullable(),
  created_by: z.string().nullable().optional(),
  updated_by: z.string().nullable(),
  updated_at: z.string()
})

export const updateCanvasInputSchema = z.object({
  title: createCanvasInputSchema.shape.title.optional(),
  visibility: canvasVisibilitySchema.optional()
})

export const updateCanvasResponseSchema = z.object({
  item: canvasSchema
})

export const canvasHistoryCommandTypeSchema = z.enum([
  'CREATE_PATH',
  'CREATE_TEXT',
  'CREATE_SHAPE',
  'CREATE_CONNECTOR',
  'CREATE_MULTIPLE',
  'UPDATE_TEXT',
  'UPDATE_ELEMENT',
  'UPDATE_MULTIPLE',
  'MOVE_ELEMENT',
  'MOVE_MULTIPLE',
  'DELETE_ELEMENT',
  'DELETE_MULTIPLE'
])

export const canvasMutationAuditSchema = z.object({
  action: z.enum(['undo', 'redo']),
  commandType: canvasHistoryCommandTypeSchema.optional()
})

export const upsertElementInputSchema = z.object({
  id: z.string().optional(),
  canvasId: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number().nullable().optional(),
  audit: canvasMutationAuditSchema.optional()
})

export const canvasElementSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  type: z.string(),
  data: z.unknown().nullable(),
  x: z.number(),
  y: z.number(),
  z: z.number().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  updatedAt: z.string().optional()
})

export const listElementsResponseSchema = z.object({
  items: z.array(canvasElementSchema)
})

export const upsertElementResponseSchema = z.object({
  item: canvasElementSchema
})

export const deleteElementResponseSchema = z.object({
  item: canvasElementSchema
})

export const deleteElementInputSchema = z.object({
  audit: canvasMutationAuditSchema.optional()
})

export const canvasHistoryActionSchema = z.enum([
  'created',
  'modified',
  'deleted',
  'undo',
  'redo'
])

export const canvasHistoryElementTypeSchema = z.enum([
  'path',
  'text',
  'shape',
  'connector'
])

export const canvasHistoryRowSchema = z.object({
  id: z.string(),
  canvas_id: z.string(),
  action: canvasHistoryActionSchema,
  element_id: z.string(),
  element_type: canvasHistoryElementTypeSchema,
  command_type: canvasHistoryCommandTypeSchema.nullable(),
  actor_id: z.string().nullable(),
  actor_name: z.string().nullable(),
  actor_email: z.string().nullable(),
  actor_image: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string()
})

export const canvasHistoryEntrySchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  action: canvasHistoryActionSchema,
  elementId: z.string(),
  elementType: canvasHistoryElementTypeSchema,
  commandType: canvasHistoryCommandTypeSchema.nullable(),
  actor: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable()
  }),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string()
})

export const listCanvasHistoryResponseSchema = z.object({
  items: z.array(canvasHistoryEntrySchema),
  nextBefore: z.string().nullable()
})

export const userSearchResponseSchema = z.object({
  items: z.array(userSearchResultSchema)
})

export const canvasMemberSchema = z.object({
  userId: z.string(),
  role: roleSchema,
  email: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  addedAt: z.string().nullable()
})

export const listMembersResponseSchema = z.object({
  items: z.array(canvasMemberSchema)
})

export const addMemberInputSchema = z.object({
  userId: z.string().min(1, 'User id is required.'),
  role: memberRoleSchema
})

export const updateMemberRoleInputSchema = z.object({
  role: memberRoleSchema
})

export const memberResponseSchema = z.object({
  item: canvasMemberSchema
})

export const listAccessRequestsResponseSchema = z.object({
  items: z.array(accessRequestSchema)
})

export const resolveAccessRequestInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    role: memberRoleSchema.default('reader')
  }),
  z.object({ action: z.literal('deny') })
])

export type CanvasElementRow = z.infer<typeof canvasElementRowSchema>
export type UpdateCanvasInput = z.infer<typeof updateCanvasInputSchema>
export type UpdateCanvasResponse = z.infer<typeof updateCanvasResponseSchema>
export type UpsertElementInput = z.infer<typeof upsertElementInputSchema>
export type CanvasMutationAuditInput = NonNullable<UpsertElementInput['audit']>
export type CanvasElement = z.infer<typeof canvasElementSchema>
export type ListElementsResponse = z.infer<typeof listElementsResponseSchema>
export type UpsertElementResponse = z.infer<typeof upsertElementResponseSchema>
export type DeleteElementInput = z.infer<typeof deleteElementInputSchema>
export type DeleteElementResponse = z.infer<typeof deleteElementResponseSchema>
export type CanvasHistoryAction = z.infer<typeof canvasHistoryActionSchema>
export type CanvasHistoryElementType = z.infer<
  typeof canvasHistoryElementTypeSchema
>
export type CanvasHistoryCommandType = z.infer<
  typeof canvasHistoryCommandTypeSchema
>
export type CanvasHistoryRow = z.infer<typeof canvasHistoryRowSchema>
export type CanvasHistoryEntry = z.infer<typeof canvasHistoryEntrySchema>
export type ListCanvasHistoryResponse = z.infer<
  typeof listCanvasHistoryResponseSchema
>
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>
export type CanvasMember = z.infer<typeof canvasMemberSchema>
export type ListMembersResponse = z.infer<typeof listMembersResponseSchema>
export type AddMemberInput = z.infer<typeof addMemberInputSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>
export type MemberResponse = z.infer<typeof memberResponseSchema>
export type ListAccessRequestsResponse = z.infer<
  typeof listAccessRequestsResponseSchema
>
export type ResolveAccessRequestInput = z.infer<
  typeof resolveAccessRequestInputSchema
>
