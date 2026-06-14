import type { DisplayMember, WorkspaceMember } from '$lib/workspace/types'
import { getPresenceIdentity } from '$lib/workspace/presence-identity'

export function displayMembers(
  members: Record<string, WorkspaceMember>,
  userId: string,
  userEmail: string | null | undefined,
  cursorColor: string,
  isAnonymousSelf = false
) {
  const merged: Record<string, WorkspaceMember | undefined> = {
    ...members,
    [userId]: getPresenceIdentity(
      userId,
      userEmail,
      isAnonymousSelf,
      () => cursorColor
    )
  }

  const unique = new Map<string, DisplayMember>()

  for (const [id, member] of Object.entries(merged)) {
    if (member) {
      unique.set(id, {
        id,
        name: member.name,
        color: member.color,
        isAnonymous: member.isAnonymous
      })
    }
  }

  return Array.from(unique.values())
}
