import { describe, expect, it } from 'vite-plus/test'
import { render } from 'svelte/server'
import CanvasWorkspace from '$lib/components/canvas/workspace/CanvasWorkspace.svelte'
import type { CanvasElement } from '$lib/workspace/schema'
import type { Scene } from '$lib/scenes/schema'

// The Editor/Scenes mode switcher is an editing affordance: readers can
// still open scene cards by double-clicking them, but they don't get the
// mode toggle.
describe('scene mode switcher visibility', () => {
  function renderWorkspace(role: 'reader' | 'editor' | 'owner') {
    return render(CanvasWorkspace, {
      props: {
        canvasId: 'canvas-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        role
      }
    }).body
  }

  it('hides the mode switcher from read-only users', () => {
    expect(renderWorkspace('reader')).not.toContain('Scenes')
  })

  it('renders the mode switcher for editors and owners', () => {
    expect(renderWorkspace('editor')).toContain('Scenes')
    expect(renderWorkspace('owner')).toContain('Scenes')
  })

  it('server-renders initial drawing elements and scene cards', () => {
    const timestamp = '2026-06-12T00:00:00.000Z'
    const initialElements: CanvasElement[] = [
      {
        id: 'path-1',
        canvasId: 'canvas-1',
        type: 'path',
        data: {
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 }
          ],
          color: '#111111',
          width: 5,
          opacity: 0.75
        },
        x: 0,
        y: 0,
        z: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      },
      {
        id: 'text-1',
        canvasId: 'canvas-1',
        type: 'text',
        data: {
          text: 'Server seeded text',
          color: '#222222',
          fontSize: 18,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          listStyle: 'none'
        },
        x: 10,
        y: 20,
        z: null,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        updatedAt: timestamp
      }
    ]
    const initialScenes: Scene[] = [
      {
        id: 'scene-1',
        canvasId: 'canvas-1',
        type: 'document',
        title: 'Server seeded scene',
        x: 100,
        y: 80,
        width: 320,
        height: 200,
        rotation: 0,
        settings: { preview: 'SSR preview' },
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ]

    const body = render(CanvasWorkspace, {
      props: {
        canvasId: 'canvas-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        role: 'editor',
        initialElements,
        initialScenes
      }
    }).body

    expect(body).toContain('M 1 2 L 3 4')
    expect(body).toContain('Server seeded text')
    expect(body).toContain('Server seeded scene')
  })
})
