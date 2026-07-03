import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function bestEffort<T>(promise: Promise<T>): Promise<T | null> {
  const [result] = await Promise.allSettled([promise])
  return result.status === 'fulfilled' ? result.value : null
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function sanitizeRedirectTarget(target: string | null): string {
  if (!target) {
    return '/home'
  }

  if (!target.startsWith('/') || target.startsWith('//')) {
    return '/home'
  }

  const searchStart = target.search(/[?#]/)
  const pathname = searchStart === -1 ? target : target.slice(0, searchStart)
  const suffix = searchStart === -1 ? '' : target.slice(searchStart)

  if (pathname === '/') {
    return `/home${suffix}`
  }

  if (pathname === '/login') {
    return '/home'
  }

  return target
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('sanitizeRedirectTarget', () => {
    it('keeps safe in-app redirects', () => {
      expect(sanitizeRedirectTarget('/canvas/123?view=full')).toBe(
        '/canvas/123?view=full'
      )
    })

    it('rejects external redirects', () => {
      expect(sanitizeRedirectTarget('https://example.com')).toBe('/home')
      expect(sanitizeRedirectTarget('//example.com')).toBe('/home')
    })

    it('normalizes the root route to home', () => {
      expect(sanitizeRedirectTarget('/')).toBe('/home')
      expect(sanitizeRedirectTarget('/?sort=title&dir=desc')).toBe(
        '/home?sort=title&dir=desc'
      )
    })

    it('avoids sending authenticated users back to login', () => {
      expect(sanitizeRedirectTarget('/login')).toBe('/home')
      expect(sanitizeRedirectTarget('/login?redirect=%2Fcanvas%2F123')).toBe(
        '/home'
      )
    })
  })
}
