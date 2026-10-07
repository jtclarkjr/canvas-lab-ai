import type { RequestHandler } from '@sveltejs/kit'
import {
  accessRequestResponseSchema,
  accessRequestStatusSchema,
  requestAccessInputSchema
} from '#lib/canvas/schema.js'
import { listAccessRequestsResponseSchema } from '#lib/workspace/schema.js'
import {
  requireCanvasRole,
  resolveCanvasAccess
} from '#lib/server/canvas-access.js'
import {
  badRequest,
  handleApiError,
  parseInput,
  parseJsonBody,
  withAccountAuth
} from '#lib/server/api-error.js'
import { roleAtLeast } from '#lib/canvas/roles.js'
import { withRateLimit } from '#lib/server/rate-limit.js'
import { getSupabase } from '#lib/server/supabase.js'
import type { Database } from '#lib/server/database.types.js'

type AccessRequestRow =
  Database['public']['Tables']['canvas_access_requests']['Row']
type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'email' | 'display_name' | 'avatar_url'
>

const toAccessRequest = (
  row: Pick<
    AccessRequestRow,
    'id' | 'canvas_id' | 'status' | 'requested_role' | 'created_at'
  >,
  requester?: ProfileRow
) => ({
  id: row.id,
  canvasId: row.canvas_id,
  status: row.status,
  requestedRole: row.requested_role,
  createdAt: row.created_at,
  ...(requester
    ? {
        requester: {
          id: requester.id,
          email: requester.email,
          displayName: requester.display_name,
          avatarUrl: requester.avatar_url
        }
      }
    : null)
})

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      await requireCanvasRole(supabase, canvasId, user.id, 'admin')

      const statusParam = event.url.searchParams.get('status')
      const status = statusParam
        ? accessRequestStatusSchema.parse(statusParam)
        : 'pending'

      const { data: requests, error } = await supabase
        .from('canvas_access_requests')
        .select(
          'id, canvas_id, requester_id, status, requested_role, created_at'
        )
        .eq('canvas_id', canvasId)
        .eq('status', status)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      const requesterIds = (requests ?? []).map((row) => row.requester_id)
      const { data: profiles, error: profilesError } = requesterIds.length
        ? await supabase
            .from('profiles')
            .select('id, email, display_name, avatar_url')
            .in('id', requesterIds)
        : { data: [], error: null }

      if (profilesError) {
        throw profilesError
      }

      const profileById = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile])
      )

      return Response.json(
        listAccessRequestsResponseSchema.parse({
          items: (requests ?? []).map((row) =>
            toAccessRequest(row, profileById.get(row.requester_id))
          )
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAccountAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { role } = await resolveCanvasAccess(supabase, canvasId, user.id)

      // Body is optional: a bare POST requests unspecified access (admin
      // picks the role); public viewers and readers send
      // { requestedRole: 'editor' }.
      const hasJsonBody = event.request.headers
        .get('content-type')
        ?.includes('application/json')
      const payload = hasJsonBody ? await parseJsonBody(event.request) : {}
      const input = parseInput(requestAccessInputSchema, payload)

      // Existing members may only request an upgrade above their current
      // role (e.g. a reader asking for editor); anything else is a no-op.
      if (
        role !== null &&
        (!input.requestedRole || roleAtLeast(role, input.requestedRole))
      ) {
        throw badRequest('You already have access to this canvas.', {
          code: 'already_member'
        })
      }

      const { data: pending, error: pendingError } = await supabase
        .from('canvas_access_requests')
        .select('id, canvas_id, status, requested_role, created_at')
        .eq('canvas_id', canvasId)
        .eq('requester_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (pendingError) {
        throw pendingError
      }

      if (pending) {
        if (
          input.requestedRole &&
          pending.requested_role !== input.requestedRole
        ) {
          const { data: updated, error: updateError } = await supabase
            .from('canvas_access_requests')
            .update({ requested_role: input.requestedRole })
            .eq('id', pending.id)
            .select('id, canvas_id, status, requested_role, created_at')
            .single()

          if (updateError || !updated) {
            throw updateError ?? new Error('Failed to update access request')
          }

          return Response.json(
            accessRequestResponseSchema.parse({
              item: toAccessRequest(updated)
            })
          )
        }

        return Response.json(
          accessRequestResponseSchema.parse({ item: toAccessRequest(pending) })
        )
      }

      const { data, error } = await supabase
        .from('canvas_access_requests')
        .insert({
          canvas_id: canvasId,
          requester_id: user.id,
          requested_role: input.requestedRole ?? null
        })
        .select('id, canvas_id, status, requested_role, created_at')
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create access request')
      }

      return Response.json(
        accessRequestResponseSchema.parse({ item: toAccessRequest(data) }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
