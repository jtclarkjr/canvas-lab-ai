import { describe, expect, it } from 'vite-plus/test'
import {
  forbidden,
  notFound,
  serializeApiError,
  validationError
} from '$lib/server/api-error'

describe('api-error', () => {
  it('creates 403 errors with forbidden()', () => {
    const error = forbidden('No access.', { code: 'canvas_access_denied' })

    expect(error.status).toBe(403)
    expect(error.code).toBe('canvas_access_denied')
  })

  it('serializes the error code so clients can branch on it', () => {
    const serialized = serializeApiError(
      notFound('Canvas not found.', { code: 'canvas_not_found' })
    )

    expect(serialized).toEqual({
      message: 'Canvas not found.',
      code: 'canvas_not_found'
    })
  })

  it('omits code when absent and keeps issues', () => {
    const serialized = serializeApiError(
      validationError('Invalid.', { title: ['Required'] })
    )

    expect(serialized.message).toBe('Invalid.')
    expect(serialized.issues).toEqual({ title: ['Required'] })
    expect('code' in serialized).toBe(false)
  })
})
