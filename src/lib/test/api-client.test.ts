import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'
import {
  ApiClientError,
  apiRequest,
  getApiHeaders,
  isSchemaError,
  parseResponse
} from '$lib/api-client'
import { setCurrentSession } from '$lib/auth/session-store'
import type { Session } from '$lib/auth/types'

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

const originalFetch = globalThis.fetch

describe('api client boundary', () => {
  beforeEach(() => {
    setCurrentSession(null, false)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('parses successful JSON through the supplied schema', async () => {
    const schema = z.object({ ok: z.literal(true) })

    await expect(
      parseResponse(
        jsonResponse({ ok: true }),
        (payload) => schema.parse(payload),
        'Fallback error.'
      )
    ).resolves.toEqual({ ok: true })
  })

  it('throws API errors with status, code, and issues from error responses', async () => {
    const error = await parseResponse(
      jsonResponse(
        {
          message: 'Invalid input.',
          code: 'validation_error',
          issues: { title: ['Required'] }
        },
        422
      ),
      () => null,
      'Fallback error.'
    ).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_error',
      issues: { title: ['Required'] },
      message: 'Invalid input.'
    })
  })

  it('uses the fallback message when an error response is not API-shaped', async () => {
    const error = await parseResponse(
      jsonResponse({ error: 'nope' }, 500),
      () => null,
      'Fallback error.'
    ).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({ status: 500, message: 'Fallback error.' })
  })

  it('treats non-JSON responses as API client errors', async () => {
    const error = await parseResponse(
      new Response('not-json', { status: 200 }),
      () => null,
      'Fallback error.'
    ).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      status: 200,
      message: 'Expected a JSON response from the API.'
    })
  })

  it('lets schema errors surface from successful responses', async () => {
    const schema = z.object({ ok: z.literal(true) })
    const error = await parseResponse(
      jsonResponse({ ok: false }),
      (payload) => schema.parse(payload),
      'Fallback error.'
    ).catch((cause: unknown) => cause)

    expect(isSchemaError(error)).toBe(true)
  })

  it('adds the bearer token while preserving caller headers', async () => {
    setCurrentSession(
      {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { isAnonymous: false }
      } as unknown as Session,
      false
    )

    const headers = await getApiHeaders({ accept: 'application/json' })

    expect(headers.get('accept')).toBe('application/json')
    expect(headers.get('authorization')).toBe('Bearer access-token')
  })

  it('wraps authenticated fetch and response parsing in one request helper', async () => {
    setCurrentSession(
      {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { isAnonymous: false }
      } as unknown as Session,
      false
    )

    const requests: unknown[] = []
    globalThis.fetch = async (input, init) => {
      requests.push([input, init])
      return jsonResponse({ ok: true })
    }

    const result = await apiRequest('/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' }),
      parse: (payload) => z.object({ ok: z.literal(true) }).parse(payload),
      fallbackMessage: 'Failed.'
    })

    expect(result).toEqual({ ok: true })
    expect(requests).toHaveLength(1)
    const [, init] = requests[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe('Bearer access-token')
    expect(headers.get('content-type')).toBe('application/json')
  })
})
