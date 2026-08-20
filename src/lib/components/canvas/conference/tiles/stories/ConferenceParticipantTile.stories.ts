import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ConferenceStoryHarness from '../../stories/ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/Tiles/ConferenceParticipantTile',
  component: ConferenceStoryHarness,
  args: { target: 'participant-tile' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Pin Riley Chen' })
    )
    await expect(canvas.getByTestId('conference-result')).toHaveTextContent(
      'user-riley'
    )
  }
}
