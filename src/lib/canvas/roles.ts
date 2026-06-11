export type CanvasRole = 'owner' | 'admin' | 'editor' | 'reader'
export type MemberRole = Exclude<CanvasRole, 'owner'>

export const MEMBER_ROLES: MemberRole[] = ['admin', 'editor', 'reader']

export const ROLE_RANK: Record<CanvasRole, number> = {
  owner: 3,
  admin: 2,
  editor: 1,
  reader: 0
}

export function roleAtLeast(role: CanvasRole | null, min: CanvasRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export const ROLE_LABELS: Record<CanvasRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  reader: 'Reader'
}
