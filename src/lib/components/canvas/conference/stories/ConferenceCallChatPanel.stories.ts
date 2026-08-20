import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, within } from 'storybook/test'
import ConferenceStoryHarness from './ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/ConferenceCallChatPanel',
  component: ConferenceStoryHarness,
  args: { target: 'call-chat' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('The revised flow is ready for review.')
    ).toBeVisible()
  }
}
