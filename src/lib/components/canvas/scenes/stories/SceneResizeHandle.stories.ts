import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, fireEvent, within } from 'storybook/test'
import SceneStoryHarness from './SceneStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/SceneResizeHandle',
  component: SceneStoryHarness,
  args: { target: 'resize-handle' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('[role="presentation"]')
    if (!(handle instanceof HTMLElement)) throw new Error('Handle not rendered')
    await fireEvent.pointerDown(handle)
    await expect(
      within(canvasElement).getByTestId('scene-result')
    ).toHaveTextContent('resize:scene-story')
  }
}
