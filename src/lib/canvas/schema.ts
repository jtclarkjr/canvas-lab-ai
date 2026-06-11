import { z } from 'zod'

export const roleSchema = z.enum(['owner', 'admin', 'editor', 'reader'])

export const memberRoleSchema = z.enum(['admin', 'editor', 'reader'])

export const accessRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'denied'
])

export const canvasRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_by: z.string(),
  created_at: z.string()
})

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

export const createCanvasInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the canvas a title.')
    .max(100, 'Keep titles under 100 characters.')
})

export const updateCanvasInputSchema = z.object({
  title: createCanvasInputSchema.shape.title.optional()
})

export const canvasSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  role: roleSchema.optional()
})

export const getCanvasResponseSchema = z.object({
  item: canvasSchema
})

export const listCanvasesResponseSchema = z.object({
  items: z.array(canvasSchema)
})

export const createCanvasResponseSchema = z.object({
  item: canvasSchema
})

export const updateCanvasResponseSchema = z.object({
  item: canvasSchema
})

export const deleteCanvasResponseSchema = z.object({
  item: canvasSchema
})

export const upsertElementInputSchema = z.object({
  id: z.string().optional(),
  canvasId: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number().nullable().optional()
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

export const userSearchResultSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable()
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

export const accessRequestSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  status: accessRequestStatusSchema,
  createdAt: z.string(),
  requester: userSearchResultSchema.optional()
})

export const accessRequestResponseSchema = z.object({
  item: accessRequestSchema
})

export const myAccessRequestResponseSchema = z.object({
  item: accessRequestSchema.nullable()
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

export type CanvasRole = z.infer<typeof roleSchema>
export type MemberRole = z.infer<typeof memberRoleSchema>
export type AccessRequestStatus = z.infer<typeof accessRequestStatusSchema>
export type CanvasRow = z.infer<typeof canvasRowSchema>
export type CanvasElementRow = z.infer<typeof canvasElementRowSchema>
export type CreateCanvasInput = z.infer<typeof createCanvasInputSchema>
export type UpdateCanvasInput = z.infer<typeof updateCanvasInputSchema>
export type Canvas = z.infer<typeof canvasSchema>
export type ListCanvasesResponse = z.infer<typeof listCanvasesResponseSchema>
export type CreateCanvasResponse = z.infer<typeof createCanvasResponseSchema>
export type UpdateCanvasResponse = z.infer<typeof updateCanvasResponseSchema>
export type DeleteCanvasResponse = z.infer<typeof deleteCanvasResponseSchema>
export type UpsertElementInput = z.infer<typeof upsertElementInputSchema>
export type CanvasElement = z.infer<typeof canvasElementSchema>
export type ListElementsResponse = z.infer<typeof listElementsResponseSchema>
export type UpsertElementResponse = z.infer<typeof upsertElementResponseSchema>
export type DeleteElementResponse = z.infer<typeof deleteElementResponseSchema>
export type GetCanvasResponse = z.infer<typeof getCanvasResponseSchema>
export type UserSearchResult = z.infer<typeof userSearchResultSchema>
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>
export type CanvasMember = z.infer<typeof canvasMemberSchema>
export type ListMembersResponse = z.infer<typeof listMembersResponseSchema>
export type AddMemberInput = z.infer<typeof addMemberInputSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInputSchema>
export type MemberResponse = z.infer<typeof memberResponseSchema>
export type AccessRequest = z.infer<typeof accessRequestSchema>
export type AccessRequestResponse = z.infer<typeof accessRequestResponseSchema>
export type MyAccessRequestResponse = z.infer<
  typeof myAccessRequestResponseSchema
>
export type ListAccessRequestsResponse = z.infer<
  typeof listAccessRequestsResponseSchema
>
export type ResolveAccessRequestInput = z.infer<
  typeof resolveAccessRequestInputSchema
>
