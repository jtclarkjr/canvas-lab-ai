import type { Canvas } from '$lib/canvas/schema'

export const ownerCanvas: Canvas = {
  id: 'canvas-owner',
  title: 'Product discovery',
  createdBy: 'story-user',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-18T10:30:00.000Z',
  visibility: 'private',
  iconPath: null,
  iconUrl: null,
  role: 'owner'
}

export const sharedCanvas: Canvas = {
  id: 'canvas-shared',
  title: 'Research synthesis',
  createdBy: 'collaborator',
  createdAt: '2026-07-20T09:00:00.000Z',
  updatedAt: '2026-08-17T15:45:00.000Z',
  visibility: 'public',
  iconPath: null,
  iconUrl: null,
  role: 'editor'
}
