import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import SceneStoryHarness from '$lib/components/canvas/scenes/stories/SceneStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Scenes/MobileSceneEntry',
  component: SceneStoryHarness,
  args: { target: 'mobile-entry' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textbox = canvas.getByRole('textbox')
    await userEvent.type(textbox, 'Create a concise brief{Enter}')
    await expect(canvas.getByTestId('scene-result')).toHaveTextContent(
      'Create a concise brief'
    )
  }
}
