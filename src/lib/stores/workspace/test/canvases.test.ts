import { expect, it, vi } from 'vite-plus/test'
import { listCanvases } from '#lib/canvas/api.js'
import type { Canvas } from '#lib/canvas/schema.js'
import { createWorkspaceCanvasesStore } from '../canvases.svelte'

vi.mock('#lib/canvas/api.js', () => ({ listCanvases: vi.fn() }))

it('loads canvases when the route supplies an empty initial list', async () => {
  const canvases: Canvas[] = ['Test1', 'Experiment1'].map((title, index) => ({
    id: `canvas-${index}`,
    title,
    createdBy: 'user-1',
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z',
    visibility: 'private',
    iconPath: null,
    iconUrl: null,
    role: 'owner'
  }))
  vi.mocked(listCanvases).mockResolvedValue({ items: canvases })

  const store = createWorkspaceCanvasesStore({
    getActiveCanvasId: () => 'canvas-0',
    initialCanvases: []
  })
  // The workspace syncs route props before its mount loads the list.
  store.setCanvases([])
  await store.loadCanvasesList()

  expect(listCanvases).toHaveBeenCalledOnce()
  expect(store.canvases).toEqual(canvases)
  expect(store.currentCanvasTitle).toBe('Test1')
})
