import type { Cookies } from '@sveltejs/kit'
import { SUPABASE_URL } from '$app/env/private'
import { getSupabaseAuthCookieName } from '#lib/auth/supabase-cookie.js'

type SupabaseSessionCookieTokens = {
  accessToken: string
  refreshToken: string
}

export function setSupabaseSessionCookie(
  cookies: Cookies,
  tokens: SupabaseSessionCookieTokens
) {
  const cookieName = getSupabaseAuthCookieName(SUPABASE_URL ?? '')

  if (!cookieName) {
    return
  }

  cookies.set(
    cookieName,
    encodeURIComponent(
      JSON.stringify([tokens.accessToken, tokens.refreshToken])
    ),
    {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false
    }
  )
}
