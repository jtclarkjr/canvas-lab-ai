import type { Json } from '$lib/server/database.types'

export function toDbJson(value: unknown): Json {
  const serialized = JSON.stringify(value)
  return serialized === undefined ? null : (JSON.parse(serialized) as Json)
}

export function toNullableDbJson(value: unknown): Json | null {
  return value == null ? null : toDbJson(value)
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  describe('database JSON helpers', () => {
    it('round-trips serializable values before writing JSONB columns', () => {
      expect(
        toDbJson({
          title: 'Document',
          flags: [true, false],
          nested: { count: 2 }
        })
      ).toEqual({
        title: 'Document',
        flags: [true, false],
        nested: { count: 2 }
      })
    })

    it('normalizes nullable JSON values', () => {
      expect(toDbJson(undefined)).toBeNull()
      expect(toNullableDbJson(undefined)).toBeNull()
      expect(toNullableDbJson(null)).toBeNull()
      expect(toNullableDbJson({ text: 'Hello' })).toEqual({ text: 'Hello' })
    })
  })
}
