import { describe, expect, it } from 'vite-plus/test'
import { render } from 'svelte/server'
import CanvasWorkspace from '$lib/components/canvas/CanvasWorkspace.svelte'

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
})
