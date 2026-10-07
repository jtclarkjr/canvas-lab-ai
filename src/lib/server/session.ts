import { createClient, type User as SupabaseUser } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SECRET_KEY } from '$app/env/private'
import { getUserAvatarUrl, getUserDisplayName } from '#lib/auth/user-profile.js'
import { getSupabaseAuthCookieName } from '#lib/auth/supabase-cookie.js'
import { getSupabaseTokensFromCookieHeader } from '#lib/server/supabase-auth-cookie.js'
import type { RequestSession, RequestUser } from '#lib/server/types.js'

function getBearerToken(authorizationHeader: string) {
  const [scheme, token] = authorizationHeader.split(/\s+/, 2)
  if (!scheme || !token) {
    return null
  }

  return scheme.toLowerCase() === 'bearer' ? token : null
}

export function requestUserFromSupabaseUser(user: SupabaseUser): RequestUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: getUserDisplayName(user),
    image: getUserAvatarUrl(user),
    isAnonymous: user.is_anonymous === true
  }
}

export async function getRequestSession(
  request: Request
): Promise<RequestSession | null> {
  const supabaseUrl = SUPABASE_URL
  const supabaseSecretKey = SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey) {
    return null
  }

  const authorizationHeader = request.headers.get('authorization') ?? ''
  const cookieHeader = request.headers.get('cookie') ?? ''
  const authCookieName = getSupabaseAuthCookieName(supabaseUrl)
  const cookieTokens = getSupabaseTokensFromCookieHeader(
    cookieHeader,
    authCookieName
  )
  const accessToken =
    getBearerToken(authorizationHeader) ?? cookieTokens?.accessToken ?? null

  if (!accessToken) {
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey)
  const {
    data: { user },
    error
  } = await supabase.auth.getUser(accessToken)

  if (!error && user) {
    return {
      user: requestUserFromSupabaseUser(user)
    }
  }

  // Access token is invalid/expired — try refreshing with the refresh token from the cookie
  const refreshToken = cookieTokens?.refreshToken
  if (!refreshToken) {
    return null
  }

  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession({ refresh_token: refreshToken })

  if (refreshError || !refreshData.session || !refreshData.user) {
    return null
  }

  return {
    user: requestUserFromSupabaseUser(refreshData.user),
    refreshedTokens: {
      accessToken: refreshData.session.access_token,
      refreshToken: refreshData.session.refresh_token
    }
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('request auth header parsing', () => {
    it('extracts bearer tokens', () => {
      expect(getBearerToken('Bearer access-token')).toBe('access-token')
    })

    it('returns null for non-bearer auth schemes', () => {
      expect(getBearerToken('Basic abc123')).toBeNull()
    })

    it('returns null for empty auth headers', () => {
      expect(getBearerToken('')).toBeNull()
    })
  })
}
