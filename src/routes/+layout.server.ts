import type { LayoutServerLoad } from './$types'
import { isAnonymousUser } from '#lib/auth/anonymous.js'
import { CANVASES_DEPENDENCY } from '#lib/canvas/consts.js'
import { getAuthConfig } from '#lib/server/auth-config.js'
import {
  createEmptyCanvasListData,
  listCanvasesForUser
} from '#lib/server/canvas-list.js'
import type { CanvasListData } from '#lib/server/types.js'
import { getSupabase } from '#lib/server/supabase.js'

function canvasListError(error: unknown): CanvasListData {
  return {
    items: [],
    error: error instanceof Error ? error.message : 'Failed to load canvases.'
  }
}

export const load: LayoutServerLoad = async ({ depends, locals }) => {
  depends(CANVASES_DEPENDENCY)

  const user = isAnonymousUser(locals.user) ? null : locals.user
  const baseData = {
    authConfig: getAuthConfig(),
    user
  }

  if (!user) {
    return {
      ...baseData,
      canvasList: createEmptyCanvasListData()
    }
  }

  try {
    return {
      ...baseData,
      canvasList: {
        ...(await listCanvasesForUser(getSupabase(), user.id)),
        error: null
      }
    }
  } catch (error) {
    return {
      ...baseData,
      canvasList: canvasListError(error)
    }
  }
}
