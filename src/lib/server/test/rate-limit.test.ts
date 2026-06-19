import { describe, expect, it } from 'vite-plus/test'
import { withRateLimit } from '$lib/server/rate-limit'

function request(path: string, ip: string) {
  return new Request(`https://canvas.example${path}`, {
    headers: { 'x-forwarded-for': ip }
  })
}

describe('rate limit boundary', () => {
  it('adds limit headers and rejects requests after the configured limit', async () => {
    const path = `/api/rate-limit-test-${crypto.randomUUID()}`
    const ip = crypto.randomUUID()
    const handler = withRateLimit(
      async () => new Response(JSON.stringify({ ok: true })),
      { maxRequests: 2, windowMs: 60_000 }
    )

    const first = await handler({ request: request(path, ip) })
    const second = await handler({ request: request(path, ip) })
    const third = await handler({ request: request(path, ip) })

    expect(first.status).toBe(200)
    expect(first.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(first.headers.get('X-RateLimit-Remaining')).toBe('1')
    expect(second.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(third.status).toBe(429)
    expect(third.headers.get('Retry-After')).toBeTruthy()
    await expect(third.json()).resolves.toEqual({
      message: 'Too many requests. Please try again later.'
    })
  })
})
