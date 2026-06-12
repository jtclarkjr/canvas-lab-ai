import { json, type RequestHandler } from '@sveltejs/kit'
import {
  sceneDocumentResponseSchema,
  sceneDocumentRowSchema,
  updateSceneDocumentInputSchema
} from '$lib/scenes/schema'
import { requireCanvasRole } from '$lib/server/canvas-access'
import {
  assertSceneModify,
  requireScene,
  requireSceneDocument
} from '$lib/server/scene-access'
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
      const { canvasId, sceneId, documentId } = event.params

      if (!canvasId || !sceneId || !documentId) {
        return json({ message: 'Ids are required.' }, { status: 400 })
      }

      await requireCanvasRole(supabase, canvasId, user.id, 'reader')
      await requireScene(supabase, canvasId, sceneId)
      const document = await requireSceneDocument(supabase, sceneId, documentId)

      return json(
        sceneDocumentResponseSchema.parse({
          item: sceneDocumentRowToDocument(sceneDocumentRowSchema.parse(document))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const PATCH: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId, sceneId, documentId } = event.params

      if (!canvasId || !sceneId || !documentId) {
        return json({ message: 'Ids are required.' }, { status: 400 })
      }

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const scene = await requireScene(supabase, canvasId, sceneId)
      assertSceneModify(role, scene, user.id)
      const document = await requireSceneDocument(supabase, sceneId, documentId)

      const payload = await parseJsonBody(event.request)
      const input = parseInput(updateSceneDocumentInputSchema, payload)

      const { data, error } = await supabase
        .from('canvas_scene_documents')
        .update({
          ...(input.title !== undefined ? { title: input.title } : null),
          ...(input.status !== undefined ? { status: input.status } : null),
          ...(input.content !== undefined
            ? { content: input.content as Json }
            : null),
          updated_by: user.id
        })
        .eq('id', document.id)
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error('Failed to update scene document')
      }

      return json(
        sceneDocumentResponseSchema.parse({
          item: sceneDocumentRowToDocument(sceneDocumentRowSchema.parse(data))
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
      const { canvasId, sceneId, documentId } = event.params

      if (!canvasId || !sceneId || !documentId) {
        return json({ message: 'Ids are required.' }, { status: 400 })
      }

      const { role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'editor'
      )
      const scene = await requireScene(supabase, canvasId, sceneId)
      assertSceneModify(role, scene, user.id)
      const document = await requireSceneDocument(supabase, sceneId, documentId)

      const { error } = await supabase
        .from('canvas_scene_documents')
        .delete()
        .eq('id', document.id)

      if (error) {
        throw error
      }

      return json(
        sceneDocumentResponseSchema.parse({
          item: sceneDocumentRowToDocument(sceneDocumentRowSchema.parse(document))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
