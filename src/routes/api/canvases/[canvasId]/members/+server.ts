import { json, type RequestHandler } from '@sveltejs/kit'
import {
  addMemberInputSchema,
  listMembersResponseSchema,
  memberResponseSchema
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
import type { Database } from '$lib/server/database.types'

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'email' | 'display_name' | 'avatar_url'
>

const toMember = (
  userId: string,
  role: 'owner' | 'admin' | 'editor' | 'reader',
  profile: ProfileRow | undefined,
  addedAt: string | null
) => ({
  userId,
  role,
  email: profile?.email ?? '',
  displayName: profile?.display_name ?? null,
  avatarUrl: profile?.avatar_url ?? null,
  addedAt
})

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { canvas } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'admin'
      )

      const { data: members, error } = await supabase
        .from('canvas_members')
        .select('user_id, role, created_at')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      const userIds = [
        canvas.created_by,
        ...(members ?? []).map((member) => member.user_id)
      ]

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        throw profilesError
      }

      const profileById = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile])
      )

      return json(
        listMembersResponseSchema.parse({
          items: [
            toMember(
              canvas.created_by,
              'owner',
              profileById.get(canvas.created_by),
              null
            ),
            ...(members ?? []).map((member) =>
              toMember(
                member.user_id,
                member.role,
                profileById.get(member.user_id),
                member.created_at
              )
            )
          ]
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
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { canvas } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'admin'
      )

      const payload = await parseJsonBody(event.request)
      const input = parseInput(addMemberInputSchema, payload)

      if (input.userId === canvas.created_by) {
        throw badRequest('The owner already has full access.', {
          code: 'cannot_modify_owner'
        })
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .eq('id', input.userId)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profile) {
        throw notFound('User not found.', {
          code: 'user_not_found',
          details: { userId: input.userId }
        })
      }

      const { data: member, error } = await supabase
        .from('canvas_members')
        .upsert(
          {
            canvas_id: canvasId,
            user_id: input.userId,
            role: input.role,
            invited_by: user.id
          },
          { onConflict: 'canvas_id,user_id' }
        )
        .select()
        .single()

      if (error || !member) {
        throw error ?? new Error('Failed to add canvas member')
      }

      // Adding someone directly settles any request they had open.
      await supabase
        .from('canvas_access_requests')
        .update({
          status: 'approved',
          resolved_by: user.id,
          resolved_role: input.role
        })
        .eq('canvas_id', canvasId)
        .eq('requester_id', input.userId)
        .eq('status', 'pending')

      return json(
        memberResponseSchema.parse({
          item: toMember(member.user_id, member.role, profile, member.created_at)
        }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
