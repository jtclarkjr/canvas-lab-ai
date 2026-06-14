export const ANONYMOUS_PRESENCE_NAME = 'Guest viewer'
export const ANONYMOUS_PRESENCE_COLOR = '#94a3b8'

export function getPresenceIdentity(
  userId: string,
  userEmail: string | null | undefined,
  isAnonymous: boolean,
  colorFromId: (id: string) => string
) {
  if (isAnonymous) {
    return {
      name: ANONYMOUS_PRESENCE_NAME,
      color: ANONYMOUS_PRESENCE_COLOR,
      isAnonymous: true
    }
  }

  return {
    name: userEmail?.trim() || 'You',
    color: colorFromId(userId),
    isAnonymous: false
  }
}

export function getWorkspaceAvatarInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)

  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase()
  }

  return words[0]?.slice(0, 2).toUpperCase() || 'U'
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('presence identity', () => {
    it('uses a stable guest identity for anonymous viewers', () => {
      expect(
        getPresenceIdentity('anon-user', '', true, () => 'red')
      ).toMatchObject({
        name: 'Guest viewer',
        color: '#94a3b8',
        isAnonymous: true
      })
    })

    it('builds compact initials from names', () => {
      expect(getWorkspaceAvatarInitials('Guest viewer')).toBe('GV')
      expect(getWorkspaceAvatarInitials('octavia')).toBe('OC')
      expect(getWorkspaceAvatarInitials('')).toBe('U')
    })
  })
}
