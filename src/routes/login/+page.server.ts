import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { isAnonymousUser } from '#lib/auth/anonymous.js'
import { sanitizeRedirectTarget } from '#lib/utils.js'

export const load: PageServerLoad = async ({ locals, url }) => {
  if (locals.user && !isAnonymousUser(locals.user)) {
    throw redirect(
      303,
      sanitizeRedirectTarget(url.searchParams.get('redirect'))
    )
  }

  return {}
}
