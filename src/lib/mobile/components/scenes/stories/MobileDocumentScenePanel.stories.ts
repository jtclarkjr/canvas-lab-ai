import type { Meta, StoryObj } from '@storybook/sveltekit'
import { http, HttpResponse } from 'msw'
import SceneStoryHarness from '$lib/components/canvas/scenes/stories/SceneStoryHarness.svelte'
import { draftDocument } from '$lib/components/canvas/scenes/document/stories/fixtures'
const meta = {
  title: 'Mobile/Canvas/Scenes/MobileDocumentScenePanel',
  component: SceneStoryHarness,
  args: { target: 'mobile-document-panel' },
  tags: ['autodocs', 'visual'],
  parameters: {
    msw: {
      handlers: [
        http.get(
          '*/api/canvases/:canvasId/scenes/:sceneId/documents/:documentId',
          () => HttpResponse.json({ item: draftDocument })
        ),
        http.get('*/api/canvases/:canvasId/scenes/:sceneId/messages', () =>
          HttpResponse.json({ items: [] })
        )
      ]
    }
  }
} satisfies Meta<typeof SceneStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
