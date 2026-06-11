import { describe, expect, it } from 'vite-plus/test'
import { ROLE_RANK, roleAtLeast } from '$lib/canvas/roles'
import type { CanvasRole } from '$lib/canvas/roles'

describe('canvas roles', () => {
  it('ranks owner > admin > editor > reader', () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin)
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.editor)
    expect(ROLE_RANK.editor).toBeGreaterThan(ROLE_RANK.reader)
  })

  it('compares roles against a minimum', () => {
    const roles: CanvasRole[] = ['owner', 'admin', 'editor', 'reader']

    const matrix = roles.map((role) =>
      roles.map((min) => roleAtLeast(role, min))
    )

    expect(matrix).toEqual([
      [true, true, true, true],
      [false, true, true, true],
      [false, false, true, true],
      [false, false, false, true]
    ])
  })

  it('denies when role is missing', () => {
    expect(roleAtLeast(null, 'reader')).toBe(false)
  })
})
