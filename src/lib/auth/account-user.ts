import { isAccountUser } from '$lib/auth/anonymous'
import type { User } from '$lib/auth/types'

export type AccountUser = User | Record<string, unknown>

export function getSignedInAccountUser(
  sessionUser: unknown,
  pageUser: unknown
) {
  if (isAccountUser(sessionUser)) {
    return sessionUser as AccountUser
  }

  if (isAccountUser(pageUser)) {
    return pageUser as AccountUser
  }

  return null
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  function createUser(overrides: Partial<User> = {}) {
    return {
      id: 'user-1',
      aud: 'authenticated',
      app_metadata: {},
      created_at: '2026-04-19T00:00:00.000Z',
      email: 'person@example.com',
      user_metadata: {},
      identities: [],
      ...overrides
    } as User
  }

  describe('getSignedInAccountUser', () => {
    it('prefers the live session user', () => {
      const sessionUser = createUser({ id: 'session-user' })
      const pageUser = createUser({ id: 'page-user' })

      expect(getSignedInAccountUser(sessionUser, pageUser)?.id).toBe(
        'session-user'
      )
    })

    it('falls back to the page user when the session user is anonymous', () => {
      const sessionUser = createUser({
        id: 'anonymous-user',
        is_anonymous: true
      } as Partial<User>)
      const pageUser = createUser({ id: 'page-user' })

      expect(getSignedInAccountUser(sessionUser, pageUser)?.id).toBe(
        'page-user'
      )
    })

    it('returns null when both candidates are anonymous or missing', () => {
      const anonymousUser = createUser({
        id: 'anonymous-user',
        is_anonymous: true
      } as Partial<User>)

      expect(getSignedInAccountUser(anonymousUser, null)).toBeNull()
    })
  })
}
