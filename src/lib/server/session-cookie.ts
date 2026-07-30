import type { Cookies } from '@sveltejs/kit'
import { env as privateEnv } from '$env/dynamic/private'
import { getSupabaseAuthCookieName } from '$lib/auth/supabase-cookie'

type SupabaseSessionCookieTokens = {
  accessToken: string
  refreshToken: string
}

export function setSupabaseSessionCookie(
  cookies: Cookies,
  tokens: SupabaseSessionCookieTokens
) {
  const cookieName = getSupabaseAuthCookieName(privateEnv.SUPABASE_URL ?? '')
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
