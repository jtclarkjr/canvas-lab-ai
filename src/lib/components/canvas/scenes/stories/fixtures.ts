import type { Scene } from '$lib/scenes/schema'

export const sceneFixture: Scene = {
  id: 'scene-story',
  canvasId: 'canvas-story',
  type: 'document',
  title: 'Research brief',
  x: 40,
  y: 36,
  width: 320,
  height: 220,
  rotation: 0,
  settings: {
    preview: 'A concise synthesis of customer interviews and market signals.'
  },
  createdBy: 'user-james',
  updatedBy: 'user-james',
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:05:00.000Z'
}

export const emptySceneFixture: Scene = {
  ...sceneFixture,
  id: 'scene-empty-story',
  title: 'Untitled document',
  settings: {}
}
