import { createClient } from '@supabase/supabase-js'
import type { Session, SessionListener, User } from '$lib/auth/types'
import { getSupabaseAuthCookieName } from '$lib/auth/supabase-cookie'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

export const hasSupabaseConfig =
  Boolean(supabaseUrl) && Boolean(supabasePublishableKey)

const cookieName = hasSupabaseConfig
  ? getSupabaseAuthCookieName(supabaseUrl)
  : 'sb-canvas-app-v4-auth-token'

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

const listeners = new Set<SessionListener>()

let currentSession: Session | null = null
let lastSessionError: string | null = null
let authUnsubscribe: (() => void) | null = null
let initializePromise: Promise<Session | null> | null = null

export function getCurrentSession() {
  return currentSession
}

export function getLastSessionError() {
  return lastSessionError
}

export function setLastSessionError(message: string | null) {
  lastSessionError = message
}

export function subscribeToSessionChanges(listener: SessionListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifySessionListeners(session: Session | null) {
  for (const listener of listeners) {
    listener(session)
  }
}

function syncSessionToCookie(session: Session | null) {
  if (typeof document === 'undefined') {
    return
  }

  if (session?.access_token && session.refresh_token) {
    const value = JSON.stringify([session.access_token, session.refresh_token])
    document.cookie = `${cookieName}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    return
  }

  document.cookie = `${cookieName}=; path=/; max-age=0`
}

export function setCurrentSession(session: Session | null, notify = true) {
  const previousSession = currentSession
  currentSession = session
  syncSessionToCookie(session)

  if (notify && previousSession !== session) {
    notifySessionListeners(session)
  }
}

export function normalizeUser(value: unknown): User | null {
  if (!value || typeof value !== "object") {
    return null
  }

  return value as User
}

export async function ensureSessionInitialized(): Promise<Session | null> {
  if (!supabase) {
    setCurrentSession(null, false)
    return null
  }

  if (authUnsubscribe === null) {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentSession(session)
      setLastSessionError(null)
    })

    authUnsubscribe = () => subscription.unsubscribe()
  }

  if (!initializePromise) {
    initializePromise = supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setLastSessionError(error.message)
          setCurrentSession(null)
          return null
        }

        setLastSessionError(null)
        setCurrentSession(data.session, false)
        return data.session
      })
      .finally(() => {
        initializePromise = null
      })
  }

  return initializePromise
}
