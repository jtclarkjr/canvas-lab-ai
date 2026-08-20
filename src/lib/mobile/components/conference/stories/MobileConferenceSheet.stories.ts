import type { Meta, StoryObj } from '@storybook/sveltekit'
import ConferenceStoryHarness from '$lib/components/canvas/conference/stories/ConferenceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Conference/MobileConferenceSheet',
  component: ConferenceStoryHarness,
  args: { target: 'mobile-sheet' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
