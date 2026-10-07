import type { CanvasRole, MemberRole } from '#lib/canvas/roles.js'

// Canvas list search
export const DEFAULT_CANVAS_SEARCH_LIMIT = 8

// Data dependency keys (invalidation)
export const CANVASES_DEPENDENCY = 'app:canvases'

// Roles
export const MEMBER_ROLES: MemberRole[] = ['admin', 'editor', 'reader']

export const ROLE_RANK: Record<CanvasRole, number> = {
  owner: 3,
  admin: 2,
  editor: 1,
  reader: 0
}

export const ROLE_LABELS: Record<CanvasRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  reader: 'Reader'
}

// Text lists
export const BULLET_PREFIX = '• '

// Text editing / layout
export const TEXT_LINE_HEIGHT = 1.25
export const TEXT_BOUNDS_PADDING = 4
export const TEXT_EDITOR_MIN_WIDTH = 120
export const TEXT_EDITOR_WIDTH_PADDING = 16

// Diagram shapes
export const DEFAULT_SHAPE_WIDTH = 160
export const DEFAULT_SHAPE_HEIGHT = 96
export const MIN_SHAPE_SIZE = 24
