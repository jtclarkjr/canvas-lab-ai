import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import SceneStoryHarness from './SceneStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/SceneDialog',
  component: SceneStoryHarness,
  args: { target: 'dialog' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Minimizes: Story = {
  tags: ['!visual'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Minimize scene' })
    )
    await waitFor(() =>
      expect(canvas.getByTestId('scene-closed')).toHaveTextContent('true')
    )
  }
}
