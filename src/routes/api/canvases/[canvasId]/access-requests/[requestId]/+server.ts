import { json, type RequestHandler } from '@sveltejs/kit'
import {
  accessRequestResponseSchema,
  resolveAccessRequestInputSchema
} from '$lib/canvas/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  badRequest,
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

export const PATCH: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!
      const requestId = event.params.requestId!

      await requireCanvasRole(supabase, canvasId, user.id, 'admin')

      const payload = await parseJsonBody(event.request)
      const input = parseInput(resolveAccessRequestInputSchema, payload)

      const { data: request, error: requestError } = await supabase
        .from('canvas_access_requests')
        .select('id, canvas_id, requester_id, status, created_at')
        .eq('id', requestId)
        .eq('canvas_id', canvasId)
        .maybeSingle()

      if (requestError) {
        throw requestError
      }

      if (!request) {
        throw notFound('Access request not found.', {
          code: 'request_not_found',
          details: { requestId }
        })
      }

      if (request.status !== 'pending') {
        throw badRequest('This request has already been resolved.', {
          code: 'request_already_resolved',
          details: { requestId, status: request.status }
        })
      }

      if (input.action === 'approve') {
        // Membership first: if marking the request resolved fails afterwards,
        // re-approving the still-pending request stays idempotent.
        const { error: memberError } = await supabase
          .from('canvas_members')
          .upsert(
            {
              canvas_id: canvasId,
              user_id: request.requester_id,
              role: input.role,
              invited_by: user.id
            },
            { onConflict: 'canvas_id,user_id' }
          )

        if (memberError) {
          throw memberError
        }
      }

      const { data, error } = await supabase
        .from('canvas_access_requests')
        .update({
          status: input.action === 'approve' ? 'approved' : 'denied',
          resolved_by: user.id,
          resolved_role: input.action === 'approve' ? input.role : null
        })
        .eq('id', requestId)
        .select('id, canvas_id, status, created_at')
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to resolve access request')
      }

      return json(
        accessRequestResponseSchema.parse({
          item: {
            id: data.id,
            canvasId: data.canvas_id,
            status: data.status,
            createdAt: data.created_at
          }
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
