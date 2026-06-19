import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'
import {
  forbidden,
  handleApiError,
  notFound,
  parseInput,
  parseJsonBody,
  requireRouteParam,
  serializeApiError,
  validationError,
  withAccountAuth
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

  it('requires a non-anonymous account user', () => {
    expect(() =>
      withAccountAuth({ id: 'anon-user', isAnonymous: true })
    ).toThrow('Log in to continue.')

    expect(withAccountAuth({ id: 'user-1', isAnonymous: false })).toEqual({
      id: 'user-1',
      isAnonymous: false
    })
  })

  it('wraps malformed JSON bodies in a 400 app error', async () => {
    const error = await parseJsonBody(
      new Request('https://canvas.example/api', {
        method: 'POST',
        body: '{not-json',
        headers: { 'content-type': 'application/json' }
      })
    ).catch((cause: unknown) => cause)

    expect(error).toMatchObject({
      status: 400,
      code: 'invalid_json',
      message: 'Request body must be valid JSON.'
    })
  })

  it('turns schema failures into validation issues', () => {
    expect(() =>
      parseInput(
        z.object({ title: z.string().min(1, 'Required') }),
        { title: '' },
        'Invalid request.'
      )
    ).toThrow('Invalid request.')

    const error = (() => {
      try {
        parseInput(
          z.object({ title: z.string().min(1, 'Required') }),
          { title: '' },
          'Invalid request.'
        )
      } catch (cause) {
        return cause
      }
    })()

    expect(error).toMatchObject({
      status: 400,
      code: 'validation_error',
      issues: { title: ['Required'] }
    })
  })

  it('turns missing route params into structured 400 errors', () => {
    const error = (() => {
      try {
        requireRouteParam(undefined, 'Canvas id', 'canvasId')
      } catch (cause) {
        return cause
      }
    })()

    expect(error).toMatchObject({
      status: 400,
      code: 'missing_route_param',
      message: 'Canvas id is required.',
      details: { param: 'canvasId' }
    })
    expect(requireRouteParam('canvas-1', 'Canvas id')).toBe('canvas-1')
  })

  it('logs unexpected API errors with request context', async () => {
    const events: unknown[] = []
    const response = handleApiError(
      new Error('Database connection failed.'),
      new Request('https://canvas.example/api/canvases', { method: 'POST' }),
      {
        logger: {
          log: (event) => events.push(event)
        }
      }
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      message: 'Something went wrong on the server.',
      code: 'internal_server_error'
    })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      source: 'api',
      expected: false,
      status: 500,
      method: 'POST',
      path: '/api/canvases',
      code: 'internal_server_error'
    })
  })
})
