import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ConferenceStoryHarness from '../../stories/ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/Controls/ConferenceCallButton',
  component: ConferenceStoryHarness,
  args: { target: 'call-button' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Start a call' }))
    await expect(canvas.getByTestId('conference-result')).toHaveTextContent(
      'join'
    )
  }
}
