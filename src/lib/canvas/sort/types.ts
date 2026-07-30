export type CanvasSortKey = 'updated' | 'created' | 'title'

export type CanvasSortDir = 'asc' | 'desc'

export type CanvasSortState = {
  key: CanvasSortKey
  dir: CanvasSortDir
}
