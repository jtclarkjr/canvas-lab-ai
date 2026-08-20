import type { Meta, StoryObj } from '@storybook/sveltekit'
import { HttpResponse, http } from 'msw'
import { expect, userEvent, within } from 'storybook/test'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/DocumentScenePanel',
  component: DocumentStoryHarness,
  args: { target: 'scene-panel' },
  tags: ['autodocs', 'visual'],
  parameters: {
    msw: {
      handlers: [
        http.get('/api/canvases/:canvasId/scenes/:sceneId/documents', () =>
          HttpResponse.json({ items: [] })
        )
      ]
    }
  }
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByText('What do you want to draft?')
    ).toBeVisible()
    const toggle = canvas.getByRole('button', {
      name: 'Toggle document library'
    })
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  }
}
