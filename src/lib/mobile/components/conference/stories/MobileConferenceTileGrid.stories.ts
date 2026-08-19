import type { Meta, StoryObj } from '@storybook/sveltekit'
import ConferenceStoryHarness from '$lib/components/canvas/conference/stories/ConferenceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Conference/MobileConferenceTileGrid',
  component: ConferenceStoryHarness,
  args: { target: 'mobile-tile-grid' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
