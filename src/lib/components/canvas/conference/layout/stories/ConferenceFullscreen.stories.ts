import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ConferenceStoryHarness from '../../stories/ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/Layout/ConferenceFullscreen',
  component: ConferenceStoryHarness,
  args: { target: 'fullscreen' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.keyboard('{Escape}')
    await expect(
      within(canvasElement).getByTestId('conference-result')
    ).toHaveTextContent('pip')
  }
}
