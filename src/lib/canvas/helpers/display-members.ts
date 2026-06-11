import type { DisplayMember, WorkspaceMember } from '$lib/canvas/types'

export function displayMembers(
  members: Record<string, WorkspaceMember>,
  userId: string,
  userEmail: string | null | undefined,
  cursorColor: string
) {
  const merged: Record<string, WorkspaceMember | undefined> = {
    ...members,
    [userId]: { name: userEmail || 'You', color: cursorColor }
  }

  const unique = new Map<string, DisplayMember>()

  for (const [id, member] of Object.entries(merged)) {
    if (member) {
      unique.set(id, { id, name: member.name, color: member.color })
    }
  }

  return Array.from(unique.values())
}
