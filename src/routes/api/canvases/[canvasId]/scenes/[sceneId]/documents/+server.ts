import { json, type RequestHandler } from '@sveltejs/kit'
import {
  createSceneDocumentInputSchema,
  listSceneDocumentsResponseSchema,
  sceneDocumentResponseSchema,
  sceneDocumentRowSchema,
  sceneDocumentStatusSchema
} from '$lib/scenes/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { assertSceneModify, requireScene } from '$lib/server/scene-access'
import { sceneDocumentRowToDocument } from '$lib/scenes/mapping'
import {
  handleApiError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import type { Json } from '$lib/server/database.types'

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId, sceneId } = event.params

      if (!canvasId || !sceneId) {
        return json({ message: 'Canvas and scene ids are required.' }, { status: 400 })
      }

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')
      await requireScene(supabase, canvasId, sceneId)

      const statusParam = event.url.searchParams.get('status')
      const status = statusParam
        ? sceneDocumentStatusSchema.parse(statusParam)
        : null

      let query = supabase
        .from('canvas_scene_documents')
        .select('*')
        .eq('scene_id', sceneId)
        .order('updated_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return json(
        listSceneDocumentsResponseSchema.parse({
          items: (data ?? []).map((row) =>
            sceneDocumentRowToDocument(sceneDocumentRowSchema.parse(row))
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
      const user = withAuth(event.locals.user)
      const { canvasId, sceneId } = event.params

      if (!canvasId || !sceneId) {
        return json({ message: 'Canvas and scene ids are required.' }, { status: 400 })
      }

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const scene = await requireScene(supabase, canvasId, sceneId)
      assertSceneModify(role, scene, user.id)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(createSceneDocumentInputSchema, payload)

      const { data, error } = await supabase
        .from('canvas_scene_documents')
        .insert({
          scene_id: sceneId,
          canvas_id: canvasId,
          kind: input.kind,
          status: input.status,
          title: input.title,
          content: input.content as Json,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to create scene document')
      }

      return json(
        sceneDocumentResponseSchema.parse({
          item: sceneDocumentRowToDocument(sceneDocumentRowSchema.parse(data))
        }),
        { status: 201 }
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
