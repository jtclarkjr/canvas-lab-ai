import type { SupabaseClient } from '@supabase/supabase-js'
import { badRequest } from '$lib/server/api-error'
import type { Canvas } from '$lib/canvas/schema'
import type { Database } from '$lib/server/database.types'

export const CANVAS_ICON_BUCKET = 'canvas-icons'
export const CANVAS_ICON_MAX_BYTES = 5 * 1024 * 1024
export const CANVAS_ICON_SIGNED_URL_EXPIRES_IN = 60 * 60

const canvasIconExtensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
} as const

type CanvasIconMimeType = keyof typeof canvasIconExtensions

type CanvasIconFile = Pick<File, 'size' | 'type'>

export function getCanvasIconExtension(contentType: string) {
  return canvasIconExtensions[contentType as CanvasIconMimeType] ?? null
}

export function validateCanvasIconFile(file: CanvasIconFile) {
  const extension = getCanvasIconExtension(file.type)

  if (!extension) {
    throw badRequest('Upload a PNG, JPEG, or WebP image.', {
      code: 'unsupported_canvas_icon_type'
    })
  }

  if (file.size <= 0) {
    throw badRequest('Upload an image file.', {
      code: 'empty_canvas_icon'
    })
  }

  if (file.size > CANVAS_ICON_MAX_BYTES) {
    throw badRequest('Keep canvas icons under 5MB.', {
      code: 'canvas_icon_too_large'
    })
  }

  return extension
}

export function buildCanvasIconPath(
  canvasId: string,
  extension: string,
  timestamp = Date.now()
) {
  return `canvases/${canvasId}/icon-${timestamp}.${extension}`
}

export async function createCanvasIconSignedUrl(
  supabase: SupabaseClient<Database>,
  iconPath: string | null | undefined
) {
  if (!iconPath) {
    return null
  }

  const { data, error } = await supabase.storage
    .from(CANVAS_ICON_BUCKET)
    .createSignedUrl(iconPath, CANVAS_ICON_SIGNED_URL_EXPIRES_IN)

  if (error) {
    return null
  }

  return data.signedUrl
}

export async function withCanvasIconUrl(
  supabase: SupabaseClient<Database>,
  canvas: Canvas
): Promise<Canvas> {
  return {
    ...canvas,
    iconUrl: await createCanvasIconSignedUrl(supabase, canvas.iconPath)
  }
}

export async function withCanvasIconUrls(
  supabase: SupabaseClient<Database>,
  canvases: Canvas[]
): Promise<Canvas[]> {
  return await Promise.all(
    canvases.map((canvas) => withCanvasIconUrl(supabase, canvas))
  )
}

export async function removeCanvasIconObject(
  supabase: SupabaseClient<Database>,
  iconPath: string | null | undefined
) {
  if (!iconPath) {
    return
  }

  await supabase.storage.from(CANVAS_ICON_BUCKET).remove([iconPath])
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('canvas icon helpers', () => {
    it('accepts supported icon content types', () => {
      expect(validateCanvasIconFile({ type: 'image/png', size: 1 })).toBe('png')
      expect(validateCanvasIconFile({ type: 'image/jpeg', size: 1 })).toBe(
        'jpg'
      )
      expect(validateCanvasIconFile({ type: 'image/webp', size: 1 })).toBe(
        'webp'
      )
    })

    it('rejects unsupported or oversized icon files', () => {
      expect(() =>
        validateCanvasIconFile({ type: 'image/svg+xml', size: 1 })
      ).toThrow()
      expect(() =>
        validateCanvasIconFile({
          type: 'image/png',
          size: CANVAS_ICON_MAX_BYTES + 1
        })
      ).toThrow()
    })

    it('builds canvas-scoped icon paths', () => {
      expect(buildCanvasIconPath('canvas-1', 'png', 123)).toBe(
        'canvases/canvas-1/icon-123.png'
      )
    })
  })
}
