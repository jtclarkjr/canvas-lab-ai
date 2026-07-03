import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ url }) => {
  throw redirect(307, `/home${url.search}`)
}
