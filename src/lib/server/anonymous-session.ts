import { createClient } from '@supabase/supabase-js'
import type { Cookies } from '@sveltejs/kit'
import { SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } from '$app/env/private'
import { internalServerError } from '#lib/server/api-error.js'
import { requestUserFromSupabaseUser } from '#lib/server/session.js'
import type { RequestSession } from '#lib/server/types.js'
import { setSupabaseSessionCookie } from '#lib/server/session-cookie.js'

export async function createAnonymousRequestSession(
  cookies: Cookies
): Promise<RequestSession> {
  const supabaseUrl = SUPABASE_URL
  const supabasePublishableKey = VITE_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    throw internalServerError('Supabase auth is not configured.', {
      code: 'missing_supabase_env'
    })
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey)
  const { data, error } = await supabase.auth.signInAnonymously()

  if (error || !data.session || !data.user) {
    throw internalServerError('Could not start a public canvas session.', {
      code: 'anonymous_session_failed',
      cause: error
    })
  }

  setSupabaseSessionCookie(cookies, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  })

  return {
    user: requestUserFromSupabaseUser(data.user)
  }
}
