import { json, type RequestHandler } from '@sveltejs/kit'
import {
  canvasRowSchema,
  uploadCanvasIconResponseSchema
} from '$lib/canvas/schema'
import {
  badRequest,
  handleApiError,
  notFound,
  withAuth
} from '$lib/server/api-error'
import {
  buildCanvasIconPath,
  CANVAS_ICON_BUCKET,
  removeCanvasIconObject,
  validateCanvasIconFile,
  withCanvasIconUrl
} from '$lib/server/canvas-icons'
import { requireCanvasRole } from '$lib/server/canvas-access'
import { toCanvas } from '$lib/server/canvas-list'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

async function parseIconFile(request: Request) {
  let formData: FormData

  try {
    formData = await request.formData()
  } catch (error) {
    throw badRequest('Request body must be multipart form data.', {
      code: 'invalid_form_data',
      cause: error
    })
  }

  const file = formData.get('file')

  if (!(file instanceof File)) {
    throw badRequest('Icon file is required.', {
      code: 'missing_canvas_icon'
    })
  }

  return file
}

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    let uploadedPath: string | null = null

    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const canvasId = event.params.canvasId!

      const { canvas, role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'admin'
      )

      const file = await parseIconFile(event.request)
      const extension = validateCanvasIconFile(file)
      const nextPath = buildCanvasIconPath(canvasId, extension)

      const { error: uploadError } = await supabase.storage
        .from(CANVAS_ICON_BUCKET)
        .upload(nextPath, await file.arrayBuffer(), {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }
      uploadedPath = nextPath

      const { data, error } = await supabase
        .from('canvases')
        .update({ icon_path: nextPath })
        .eq('id', canvasId)
        .select()
        .single()

      if (error || !data) {
        await removeCanvasIconObject(supabase, uploadedPath).catch(
          () => undefined
        )
        throw (
          error ?? notFound('Canvas not found.', { code: 'canvas_not_found' })
        )
      }

      if (canvas.icon_path && canvas.icon_path !== nextPath) {
        await removeCanvasIconObject(supabase, canvas.icon_path).catch(
          () => undefined
        )
      }

      const item = await withCanvasIconUrl(
        supabase,
        toCanvas(canvasRowSchema.parse(data), role)
      )

      return json(uploadCanvasIconResponseSchema.parse({ item }))
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

      const { canvas, role } = await requireCanvasRole(
        supabase,
        canvasId,
        user.id,
        'admin'
      )

      const { data, error } = await supabase
        .from('canvases')
        .update({ icon_path: null })
        .eq('id', canvasId)
        .select()
        .single()

      if (error || !data) {
        throw (
          error ?? notFound('Canvas not found.', { code: 'canvas_not_found' })
        )
      }

      await removeCanvasIconObject(supabase, canvas.icon_path).catch(
        () => undefined
      )

      const item = await withCanvasIconUrl(
        supabase,
        toCanvas(canvasRowSchema.parse(data), role)
      )

      return json(uploadCanvasIconResponseSchema.parse({ item }))
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
