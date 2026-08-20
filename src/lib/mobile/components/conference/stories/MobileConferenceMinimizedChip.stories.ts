import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ConferenceStoryHarness from '$lib/components/canvas/conference/stories/ConferenceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Conference/MobileConferenceMinimizedChip',
  component: ConferenceStoryHarness,
  args: { target: 'mobile-minimized-chip' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Return to call' })
    )
    await expect(canvas.getByTestId('conference-result')).toHaveTextContent(
      'fullscreen'
    )
  }
}
