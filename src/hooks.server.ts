import type { Handle } from '@sveltejs/kit/hooks'
import { getRequestSession } from '#lib/server/session.js'
import { setSupabaseSessionCookie } from '#lib/server/session-cookie.js'

export const handle: Handle = async ({ event, resolve }) => {
  const result = await getRequestSession(event.request)

  event.locals.user = result?.user ?? null

  if (result?.refreshedTokens) {
    setSupabaseSessionCookie(event.cookies, result.refreshedTokens)
  }

  return resolve(event)
}
