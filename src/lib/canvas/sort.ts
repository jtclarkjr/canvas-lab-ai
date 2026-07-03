import type { Canvas } from '$lib/canvas/schema'

export type CanvasSortKey = 'updated' | 'created' | 'title'
export type CanvasSortDir = 'asc' | 'desc'

export type CanvasSortState = {
  key: CanvasSortKey
  dir: CanvasSortDir
}

export const DEFAULT_CANVAS_SORT: CanvasSortState = {
  key: 'updated',
  dir: 'desc'
}

export const CANVAS_SORT_OPTIONS = [
  { key: 'updated', label: 'Updated' },
  { key: 'created', label: 'Created' },
  { key: 'title', label: 'Title' }
] as const

const titleCollator = new Intl.Collator('en-US', {
  numeric: true,
  sensitivity: 'base'
})

function isCanvasSortKey(value: string | null): value is CanvasSortKey {
  return value === 'updated' || value === 'created' || value === 'title'
}

function isCanvasSortDir(value: string | null): value is CanvasSortDir {
  return value === 'asc' || value === 'desc'
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function compareNumbers(a: number, b: number): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function getSortDate(canvas: Canvas, key: CanvasSortKey): string {
  return key === 'created' ? canvas.createdAt : canvas.updatedAt
}

export function getDefaultCanvasSortDir(key: CanvasSortKey): CanvasSortDir {
  return key === 'title' ? 'asc' : 'desc'
}

export function parseCanvasSort(
  searchParams: URLSearchParams
): CanvasSortState {
  const keyParam = searchParams.get('sort')
  const key = isCanvasSortKey(keyParam) ? keyParam : DEFAULT_CANVAS_SORT.key
  const dirParam = searchParams.get('dir')

  return {
    key,
    dir: isCanvasSortDir(dirParam) ? dirParam : getDefaultCanvasSortDir(key)
  }
}

export function getNextCanvasSortState(
  current: CanvasSortState,
  key: CanvasSortKey
): CanvasSortState {
  if (current.key !== key) {
    return { key, dir: getDefaultCanvasSortDir(key) }
  }

  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
}

export function compareCanvases(
  a: Canvas,
  b: Canvas,
  sort: CanvasSortState
): number {
  const direction = sort.dir === 'asc' ? 1 : -1

  if (sort.key === 'title') {
    const titleComparison =
      titleCollator.compare(a.title.trim(), b.title.trim()) * direction

    if (titleComparison !== 0) return titleComparison

    return compareNumbers(
      parseTimestamp(b.updatedAt),
      parseTimestamp(a.updatedAt)
    )
  }

  const dateComparison =
    compareNumbers(
      parseTimestamp(getSortDate(a, sort.key)),
      parseTimestamp(getSortDate(b, sort.key))
    ) * direction

  if (dateComparison !== 0) return dateComparison

  return titleCollator.compare(a.title.trim(), b.title.trim())
}

export function sortCanvases(
  canvases: Canvas[],
  sort: CanvasSortState
): Canvas[] {
  return canvases
    .map((canvas, index) => ({ canvas, index }))
    .sort((a, b) => {
      const comparison = compareCanvases(a.canvas, b.canvas, sort)
      return comparison || a.index - b.index
    })
    .map(({ canvas }) => canvas)
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest

  const canvas = (
    id: string,
    title: string,
    createdAt: string,
    updatedAt = createdAt
  ): Canvas => ({
    id,
    title,
    createdBy: 'user-1',
    createdAt,
    updatedAt,
    visibility: 'private',
    iconPath: null,
    iconUrl: null,
    role: 'owner'
  })

  describe('canvas sort', () => {
    it('parses valid sort params and defaults invalid values', () => {
      expect(parseCanvasSort(new URLSearchParams('sort=title'))).toEqual({
        key: 'title',
        dir: 'asc'
      })
      expect(
        parseCanvasSort(new URLSearchParams('sort=unknown&dir=sideways'))
      ).toEqual(DEFAULT_CANVAS_SORT)
    })

    it('toggles the active sort and uses default direction for new fields', () => {
      expect(getNextCanvasSortState(DEFAULT_CANVAS_SORT, 'updated')).toEqual({
        key: 'updated',
        dir: 'asc'
      })
      expect(getNextCanvasSortState(DEFAULT_CANVAS_SORT, 'title')).toEqual({
        key: 'title',
        dir: 'asc'
      })
    })

    it('sorts by updated date newest first by default', () => {
      const results = sortCanvases(
        [
          canvas('1', 'Alpha', '2026-01-01T00:00:00.000Z'),
          canvas(
            '2',
            'Beta',
            '2026-01-02T00:00:00.000Z',
            '2026-01-04T00:00:00.000Z'
          ),
          canvas(
            '3',
            'Gamma',
            '2026-01-03T00:00:00.000Z',
            '2026-01-03T00:00:00.000Z'
          )
        ],
        DEFAULT_CANVAS_SORT
      )

      expect(results.map((result) => result.id)).toEqual(['2', '3', '1'])
    })

    it('sorts by created date and title direction', () => {
      const rows = [
        canvas('1', 'Bravo', '2026-01-02T00:00:00.000Z'),
        canvas('2', 'Alpha', '2026-01-03T00:00:00.000Z'),
        canvas('3', 'Charlie', '2026-01-01T00:00:00.000Z')
      ]

      expect(
        sortCanvases(rows, { key: 'created', dir: 'asc' }).map(
          (result) => result.id
        )
      ).toEqual(['3', '1', '2'])
      expect(
        sortCanvases(rows, { key: 'title', dir: 'asc' }).map(
          (result) => result.id
        )
      ).toEqual(['2', '1', '3'])
    })

    it('keeps equal sort keys stable', () => {
      const rows = [
        canvas('1', 'Alpha', '2026-01-01T00:00:00.000Z'),
        canvas('2', 'Alpha', '2026-01-01T00:00:00.000Z')
      ]

      expect(sortCanvases(rows, { key: 'title', dir: 'asc' })).toEqual(rows)
    })
  })
}
