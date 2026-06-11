import { json, type RequestHandler } from '@sveltejs/kit'
import {
    canvasRowSchema,
    createCanvasInputSchema,
    createCanvasResponseSchema,
    listCanvasesResponseSchema
} from '$lib/canvas/schema'
import type { CanvasRow } from '$lib/canvas/schema'
import {
    handleApiError,
    parseInput,
    parseJsonBody,
    withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

const toCanvas = (row: CanvasRow, role?: 'owner' | 'admin' | 'editor' | 'reader') => ({
    id: row.id,
    title: row.title,
    createdBy: row.created_by,
    createdAt: row.created_at,
    ...(role ? { role } : null)
})

export const GET: RequestHandler = async (event) =>
    withRateLimit(async () => {
        try {
            const supabase = getSupabase()
            const user = withAuth(event.locals.user)

            const [owned, memberships] = await Promise.all([
                supabase
                    .from('canvases')
                    .select('*')
                    .eq('created_by', user.id),
                supabase
                    .from('canvas_members')
                    .select('canvas_id, role')
                    .eq('user_id', user.id)
            ])

            if (owned.error) {
                throw owned.error
            }

            if (memberships.error) {
                throw memberships.error
            }

            const roleByCanvasId = new Map(
                (memberships.data ?? []).map((membership) => [
                    membership.canvas_id,
                    membership.role
                ])
            )

            const sharedIds = [...roleByCanvasId.keys()]
            const shared = sharedIds.length
                ? await supabase.from('canvases').select('*').in('id', sharedIds)
                : { data: [], error: null }

            if (shared.error) {
                throw shared.error
            }

            const items = [
                ...(owned.data ?? []).map((row) =>
                    toCanvas(canvasRowSchema.parse(row), 'owner')
                ),
                ...(shared.data ?? []).map((row) => {
                    const canvas = canvasRowSchema.parse(row)
                    return toCanvas(canvas, roleByCanvasId.get(canvas.id))
                })
            ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

            return json(listCanvasesResponseSchema.parse({ items }))
        } catch (error) {
            return handleApiError(error, event.request)
        }
    })({ request: event.request })

export const POST: RequestHandler = async (event) =>
    withRateLimit(async () => {
        try {
            const supabase = getSupabase()
            const user = withAuth(event.locals.user)

            const payload = await parseJsonBody(event.request)
            const input = parseInput(createCanvasInputSchema, payload)

            const { data, error } = await supabase
                .from('canvases')
                .insert({ title: input.title, created_by: user.id })
                .select()
                .single()

            if (error || !data) {
                throw error ?? new Error('Failed to create canvas')
            }

            return json(
                createCanvasResponseSchema.parse({
                    item: toCanvas(canvasRowSchema.parse(data))
                }),
                { status: 201 }
            )
        } catch (error) {
            return handleApiError(error, event.request)
        }
    })({ request: event.request })
