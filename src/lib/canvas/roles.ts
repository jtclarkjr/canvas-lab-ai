import { ROLE_RANK } from '#lib/canvas/consts.js'

export type CanvasRole = 'owner' | 'admin' | 'editor' | 'reader'
export type MemberRole = Exclude<CanvasRole, 'owner'>

export function roleAtLeast(role: CanvasRole | null, min: CanvasRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}
