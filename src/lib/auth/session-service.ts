import type { Provider } from '@supabase/supabase-js'
import {
  ensureSessionInitialized,
  getCurrentSession,
  hasSupabaseConfig,
  setCurrentSession,
  setLastSessionError,
  supabase
} from '$lib/auth/session-store'
import { isAnonymousUser } from '$lib/auth/anonymous'
import type { Session } from '$lib/auth/types'
import { bestEffort, sanitizeRedirectTarget } from '$lib/utils'
export { getUserDisplayName } from '$lib/auth/user-profile'

export async function getAccessToken() {
  const session = getCurrentSession() ?? (await ensureSessionInitialized())
  return session?.access_token ?? null
}

export async function signInWithEmail(email: string, password: string) {
  if (!hasSupabaseConfig || !supabase) {
    return {
      data: null,
      error: { message: 'Supabase auth is not configured.' }
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    setLastSessionError(error.message)
    return { data: null, error: { message: error.message } }
  }

  setLastSessionError(null)
  setCurrentSession(data.session)
  return { data, error: null }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
) {
  if (!hasSupabaseConfig || !supabase) {
    return {
      data: null,
      error: { message: 'Supabase auth is not configured.' }
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })

  if (error) {
    setLastSessionError(error.message)
    return { data: null, error: { message: error.message } }
  }

  setLastSessionError(null)
  setCurrentSession(data.session)
  return { data, error: null }
}

export function buildOAuthCallbackUrl(redirectTarget: string, origin: string) {
  const callbackUrl = new URL('/login', origin)
  callbackUrl.searchParams.set(
    'redirect',
    sanitizeRedirectTarget(redirectTarget)
  )
  return callbackUrl.toString()
}

export async function signInWithOAuth(
  provider: Provider,
  redirectTarget = '/'
) {
  if (!hasSupabaseConfig || !supabase) {
    return {
      error: { message: 'Supabase auth is not configured.' },
      data: null
    }
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? buildOAuthCallbackUrl(redirectTarget, window.location.origin)
      : undefined

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo }
  })

  if (error) {
    setLastSessionError(error.message)
    return {
      data: null,
      error: { message: error.message }
    }
  }

  return { data, error: null }
}

export async function signOut() {
  const redirectToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.replace('/login')
    }
  }

  if (!hasSupabaseConfig || !supabase) {
    setCurrentSession(null, false)
    redirectToLogin()
    return null
  }

  setCurrentSession(null, false)
  await bestEffort(supabase.auth.signOut())
  setLastSessionError(null)
  redirectToLogin()
  return null
}

export function hasAuthenticatedSession(session: Session | null | undefined) {
  return Boolean(session?.access_token && !isAnonymousUser(session.user))
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('buildOAuthCallbackUrl', () => {
    it('routes OAuth callbacks back through the login page', () => {
      expect(
        buildOAuthCallbackUrl('/canvas/123?mode=edit', 'https://canvas.example')
      ).toBe(
        'https://canvas.example/login?redirect=%2Fcanvas%2F123%3Fmode%3Dedit'
      )
    })

    it('normalizes unsafe or looping redirects', () => {
      expect(buildOAuthCallbackUrl('/login', 'https://canvas.example')).toBe(
        'https://canvas.example/login?redirect=%2Fhome'
      )
      expect(
        buildOAuthCallbackUrl('https://example.com', 'https://canvas.example')
      ).toBe('https://canvas.example/login?redirect=%2Fhome')
    })
  })
}
