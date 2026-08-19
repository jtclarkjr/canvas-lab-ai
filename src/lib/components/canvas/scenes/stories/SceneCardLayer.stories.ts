import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import SceneStoryHarness from './SceneStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/SceneCardLayer',
  component: SceneStoryHarness,
  args: { target: 'card-layer' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'New scene' }))
    await expect(canvas.getByTestId('scene-result')).toHaveTextContent('create')
  }
}
