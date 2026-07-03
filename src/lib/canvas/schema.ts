import { z } from 'zod'

export const roleSchema = z.enum(['owner', 'admin', 'editor', 'reader'])

export const memberRoleSchema = z.enum(['admin', 'editor', 'reader'])

export const canvasVisibilitySchema = z.enum(['private', 'public'])

export const accessRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'denied'
])

export const canvasRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  visibility: canvasVisibilitySchema.default('private'),
  icon_path: z.string().nullable().default(null)
})

export const createCanvasInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the canvas a title.')
    .max(100, 'Keep titles under 100 characters.')
})

export const canvasSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  visibility: canvasVisibilitySchema.default('private'),
  iconPath: z.string().nullable().default(null),
  iconUrl: z.string().nullable().default(null),
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

export const deleteCanvasResponseSchema = z.object({
  item: canvasSchema
})

export const uploadCanvasIconResponseSchema = z.object({
  item: canvasSchema
})

export const userSearchResultSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable()
})

export const accessRequestSchema = z.object({
  id: z.string(),
  canvasId: z.string(),
  status: accessRequestStatusSchema,
  requestedRole: memberRoleSchema.nullable().optional(),
  createdAt: z.string(),
  requester: userSearchResultSchema.optional()
})

export const requestAccessInputSchema = z.object({
  requestedRole: memberRoleSchema.optional()
})

export const accessRequestResponseSchema = z.object({
  item: accessRequestSchema
})

export const myAccessRequestResponseSchema = z.object({
  item: accessRequestSchema.nullable()
})

export type CanvasRole = z.infer<typeof roleSchema>
export type MemberRole = z.infer<typeof memberRoleSchema>
export type CanvasVisibility = z.infer<typeof canvasVisibilitySchema>
export type AccessRequestStatus = z.infer<typeof accessRequestStatusSchema>
export type CanvasRow = z.infer<typeof canvasRowSchema>
export type CreateCanvasInput = z.infer<typeof createCanvasInputSchema>
export type Canvas = z.infer<typeof canvasSchema>
export type ListCanvasesResponse = z.infer<typeof listCanvasesResponseSchema>
export type CreateCanvasResponse = z.infer<typeof createCanvasResponseSchema>
export type DeleteCanvasResponse = z.infer<typeof deleteCanvasResponseSchema>
export type UploadCanvasIconResponse = z.infer<
  typeof uploadCanvasIconResponseSchema
>
export type GetCanvasResponse = z.infer<typeof getCanvasResponseSchema>
export type UserSearchResult = z.infer<typeof userSearchResultSchema>
export type AccessRequest = z.infer<typeof accessRequestSchema>
export type RequestAccessInput = z.infer<typeof requestAccessInputSchema>
export type AccessRequestResponse = z.infer<typeof accessRequestResponseSchema>
export type MyAccessRequestResponse = z.infer<
  typeof myAccessRequestResponseSchema
>
