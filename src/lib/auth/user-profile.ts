import type { User } from '$lib/auth/types'

type LooseRecord = Record<string, unknown>
type DisplayUser = User | LooseRecord

const avatarKeys = [
  'avatar_url',
  'picture',
  'avatar',
  'image',
  'image_url',
  'photo_url'
]

const nameKeys = ['name', 'full_name', 'user_name', 'preferred_username']

function asRecord(value: unknown): LooseRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as LooseRecord
}

function getFirstNonEmptyString(
  record: LooseRecord | null,
  keys: string[]
): string | null {
  if (!record) {
    return null
  }

  for (const key of keys) {
    const value = record[key]
    if (typeof value !== 'string') {
      continue
    }

    const trimmed = value.trim()
    if (trimmed) {
      return trimmed
    }
  }

  return null
}

function getIdentityValue(user: DisplayUser, keys: string[]): string | null {
  const userRecord = asRecord(user)
  const identities = Array.isArray(userRecord?.identities)
    ? userRecord.identities
    : []

  for (const identity of identities) {
    const record = asRecord(
      (identity as { identity_data?: unknown } | null)?.identity_data
    )
    const value = getFirstNonEmptyString(record, keys)
    if (value) {
      return value
    }
  }

  return null
}

export function getUserDisplayName(user: DisplayUser | null | undefined) {
  if (!user) {
    return 'Guest'
  }

  const userRecord = asRecord(user)
  const directName = getFirstNonEmptyString(userRecord, ['name'])
  if (directName) {
    return directName
  }

  const metadata = asRecord(userRecord?.user_metadata)
  const name =
    getFirstNonEmptyString(metadata, nameKeys) ??
    getIdentityValue(user, nameKeys)
  if (name) {
    return name
  }

  const email = getFirstNonEmptyString(userRecord, ['email']) ?? ''
  return email || 'User'
}

export function getUserAvatarUrl(user: DisplayUser | null | undefined) {
  if (!user) {
    return null
  }

  const userRecord = asRecord(user)
  const directImage = getFirstNonEmptyString(userRecord, ['image'])
  if (directImage) {
    return directImage
  }

  const metadata = asRecord(userRecord?.user_metadata)
  return (
    getFirstNonEmptyString(metadata, avatarKeys) ??
    getIdentityValue(user, avatarKeys)
  )
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

  describe('getUserDisplayName', () => {
    it('prefers the metadata name', () => {
      expect(
        getUserDisplayName(
          createUser({ user_metadata: { name: '  Octavia Butler  ' } })
        )
      ).toBe('Octavia Butler')
    })

    it('falls back to the email address', () => {
      expect(
        getUserDisplayName(
          createUser({ user_metadata: {}, email: 'user@example.com' })
        )
      ).toBe('user@example.com')
    })
  })

  describe('getUserAvatarUrl', () => {
    it('uses the metadata avatar url when present', () => {
      expect(
        getUserAvatarUrl(
          createUser({
            user_metadata: {
              avatar_url: 'https://avatars.example.com/octavia.png'
            }
          })
        )
      ).toBe('https://avatars.example.com/octavia.png')
    })

    it('falls back to picture metadata for providers like Google', () => {
      expect(
        getUserAvatarUrl(
          createUser({
            user_metadata: {
              picture: 'https://avatars.example.com/google-user.png'
            }
          })
        )
      ).toBe('https://avatars.example.com/google-user.png')
    })

    it('falls back to identity data when user metadata is empty', () => {
      expect(
        getUserAvatarUrl(
          createUser({
            identities: [
              {
                id: 'identity-1',
                user_id: 'user-1',
                identity_id: 'identity-1',
                provider: 'github',
                identity_data: {
                  avatar_url: 'https://avatars.example.com/github-user.png'
                }
              }
            ] satisfies User['identities']
          })
        )
      ).toBe('https://avatars.example.com/github-user.png')
    })
  })
}
