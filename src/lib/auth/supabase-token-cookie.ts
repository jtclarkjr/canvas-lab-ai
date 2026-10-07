import { z } from 'zod'
import { getSupabaseAuthCookieName } from '#lib/auth/supabase-cookie.js'

const tokenArraySchema = z.array(z.string()).min(1)

function getCookieValue(cookieHeader: string, cookieName: string | null) {
  if (!cookieName) {
    return null
  }

  for (const cookie of cookieHeader.split(';')) {
    const trimmed = cookie.trim()
    const separatorIndex = trimmed.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const name = trimmed.slice(0, separatorIndex)
    if (name === cookieName) {
      return trimmed.slice(separatorIndex + 1)
    }
  }

  return null
}

export function getSupabaseAccessTokenFromCookieHeader(
  cookieHeader: string,
  cookieName: string | null
) {
  const tokens = getSupabaseTokensFromCookieHeader(cookieHeader, cookieName)
  return tokens?.accessToken ?? null
}

export function getSupabaseTokensFromCookieHeader(
  cookieHeader: string,
  cookieName: string | null
): { accessToken: string; refreshToken: string | null } | null {
  const cookieValue = getCookieValue(cookieHeader, cookieName)

  if (!cookieValue) {
    return null
  }

  try {
    const decoded = decodeURIComponent(cookieValue)
    const parsed = tokenArraySchema.parse(JSON.parse(decoded))
    return { accessToken: parsed[0], refreshToken: parsed[1] ?? null }
  } catch {
    return { accessToken: decodeURIComponent(cookieValue), refreshToken: null }
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('supabase auth cookie parsing', () => {
    it('reads the access token from the configured auth cookie', () => {
      const cookieHeader = [
        'theme=light',
        `sb-my-project-ref-auth-token=${encodeURIComponent(JSON.stringify(['access-token', 'refresh-token']))}`,
        'sidebar=open'
      ].join('; ')

      expect(
        getSupabaseAccessTokenFromCookieHeader(
          cookieHeader,
          'sb-my-project-ref-auth-token'
        )
      ).toBe('access-token')
    })

    it('falls back to a raw cookie token when the value is not a JSON tuple', () => {
      const cookieHeader = 'sb-my-project-ref-auth-token=raw-access-token'

      expect(
        getSupabaseAccessTokenFromCookieHeader(
          cookieHeader,
          'sb-my-project-ref-auth-token'
        )
      ).toBe('raw-access-token')
    })

    it('ignores unrelated supabase cookies', () => {
      const cookieHeader = [
        `sb-other-project-auth-token=${encodeURIComponent(JSON.stringify(['wrong-token', 'refresh-token']))}`,
        `sb-my-project-ref-auth-token=${encodeURIComponent(JSON.stringify(['access-token', 'refresh-token']))}`
      ].join('; ')

      expect(
        getSupabaseAccessTokenFromCookieHeader(
          cookieHeader,
          'sb-my-project-ref-auth-token'
        )
      ).toBe('access-token')
    })

    it('returns null when the configured auth cookie is missing', () => {
      expect(
        getSupabaseAccessTokenFromCookieHeader(
          'theme=light',
          'sb-my-project-ref-auth-token'
        )
      ).toBeNull()
    })

    it('derives the auth cookie name from the Supabase URL', () => {
      expect(
        getSupabaseAuthCookieName('https://my-project-ref.supabase.co')
      ).toBe('sb-my-project-ref-auth-token')
    })
  })
}
