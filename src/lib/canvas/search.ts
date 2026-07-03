import { DEFAULT_CANVAS_SEARCH_LIMIT } from '$lib/canvas/consts'
import type { Canvas } from '$lib/canvas/schema'
import type { CanvasSearchResult } from '$lib/canvas/types'

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function scoreCanvas(canvas: Canvas, query: string): number {
  if (!query) return 1

  const title = normalizeSearchText(canvas.title)
  const matchIndex = title.indexOf(query)

  if (matchIndex === -1) return 0
  if (title === query) return 4
  if (title.startsWith(query)) return 3
  if (title.split(/\s+/).some((word) => word.startsWith(query))) return 2

  return 1
}

export function getCanvasTitle(canvas: Pick<Canvas, 'title'>): string {
  return canvas.title.trim() || 'Untitled canvas'
}

export function getCanvasSearchResults(
  canvases: Canvas[],
  query: string,
  limit = DEFAULT_CANVAS_SEARCH_LIMIT
): CanvasSearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  const rows = canvases.map((canvas, index) => ({
    canvas,
    index,
    score: scoreCanvas(canvas, normalizedQuery)
  }))

  if (!normalizedQuery) {
    return rows.slice(0, limit)
  }

  return rows
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const canvas = (id: string, title: string): Canvas => ({
    id,
    title,
    createdBy: 'user-1',
    createdAt: `2026-06-${id.padStart(2, '0')}T00:00:00.000Z`,
    updatedAt: `2026-06-${id.padStart(2, '0')}T00:00:00.000Z`,
    visibility: 'private',
    iconPath: null,
    iconUrl: null,
    role: 'owner'
  })

  describe('canvas search', () => {
    it('returns newest-first recents for an empty query', () => {
      const results = getCanvasSearchResults(
        [canvas('1', 'First'), canvas('2', 'Second')],
        ''
      )

      expect(results.map((result) => result.canvas.title)).toEqual([
        'First',
        'Second'
      ])
    })

    it('matches titles case-insensitively', () => {
      const results = getCanvasSearchResults(
        [canvas('1', 'Roadmap'), canvas('2', 'Sketches')],
        'ROAD'
      )

      expect(results.map((result) => result.canvas.title)).toEqual(['Roadmap'])
    })

    it('ranks prefix matches before substring matches', () => {
      const results = getCanvasSearchResults(
        [
          canvas('1', 'Design Review'),
          canvas('2', 'Review Notes'),
          canvas('3', 'Architecture Review')
        ],
        'review'
      )

      expect(results.map((result) => result.canvas.title)).toEqual([
        'Review Notes',
        'Design Review',
        'Architecture Review'
      ])
    })

    it('preserves original order for equal scores', () => {
      const results = getCanvasSearchResults(
        [
          canvas('1', 'Product Plan'),
          canvas('2', 'Product Notes'),
          canvas('3', 'Product Sketch')
        ],
        'product'
      )

      expect(results.map((result) => result.canvas.id)).toEqual(['1', '2', '3'])
    })

    it('handles empty lists and no matches', () => {
      expect(getCanvasSearchResults([], '').length).toBe(0)
      expect(getCanvasSearchResults([canvas('1', 'Roadmap')], 'zzz')).toEqual(
        []
      )
    })
  })
}
