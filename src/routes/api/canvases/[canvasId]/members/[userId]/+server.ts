import { json, type RequestHandler } from '@sveltejs/kit'
import {
  memberResponseSchema,
  updateMemberRoleInputSchema
} from '$lib/canvas/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  badRequest,
  forbidden,
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import { roleAtLeast } from '$lib/canvas/roles'

export const PATCH: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!
      const targetUserId = event.params.userId!

      const { canvas } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'admin'
      )

      if (targetUserId === canvas.created_by) {
        throw badRequest('The owner role cannot be changed.', {
          code: 'cannot_modify_owner'
        })
      }

      const payload = await parseJsonBody(event.request)
      const input = parseInput(updateMemberRoleInputSchema, payload)

      const { data, error } = await supabase
        .from('canvas_members')
        .update({ role: input.role })
        .eq('canvas_id', canvasId)
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (error || !data) {
        throw notFound('Member not found.', {
          code: 'member_not_found',
          details: { userId: targetUserId }
        })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .eq('id', targetUserId)
        .maybeSingle()

      return json(
        memberResponseSchema.parse({
          item: {
            userId: data.user_id,
            role: data.role,
            email: profile?.email ?? '',
            displayName: profile?.display_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            addedAt: data.created_at
          }
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const DELETE: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!
      const targetUserId = event.params.userId!

      // Members may remove themselves; removing anyone else needs admin.
      const { canvas, role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'reader'
      )

      if (targetUserId !== user.id && !roleAtLeast(role, 'admin')) {
        throw forbidden('You do not have permission to do that.', {
          code: 'insufficient_role',
          details: { canvasId, role }
        })
      }

      if (targetUserId === canvas.created_by) {
        throw badRequest('The owner cannot be removed.', {
          code: 'cannot_modify_owner'
        })
      }

      const { data, error } = await supabase
        .from('canvas_members')
        .delete()
        .eq('canvas_id', canvasId)
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (error || !data) {
        throw notFound('Member not found.', {
          code: 'member_not_found',
          details: { userId: targetUserId }
        })
      }

      return json({ item: { userId: data.user_id, role: data.role } })
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
