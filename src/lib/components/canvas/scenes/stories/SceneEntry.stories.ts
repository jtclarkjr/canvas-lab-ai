import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import SceneStoryHarness from './SceneStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/SceneEntry',
  component: SceneStoryHarness,
  args: { target: 'entry' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const prompt = canvas.getByRole('textbox', {
      name: 'Describe the document you want to draft'
    })
    await userEvent.type(prompt, 'Summarize the research{Enter}')
    await expect(canvas.getByTestId('scene-result')).toHaveTextContent(
      'Summarize the research'
    )
  }
}
