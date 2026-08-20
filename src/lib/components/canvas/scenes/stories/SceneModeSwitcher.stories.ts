import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import SceneStoryHarness from './SceneStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/SceneModeSwitcher',
  component: SceneStoryHarness,
  args: { target: 'mode-switcher' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('tab', { name: 'Switch to Workflows mode' })
    )
    await expect(canvas.getByTestId('scene-result')).toHaveTextContent(
      'workflows'
    )
  }
}
