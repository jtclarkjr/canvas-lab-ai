import type { Meta, StoryObj } from '@storybook/sveltekit'
import ConferenceStoryHarness from '../../stories/ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/Tiles/ConferenceTileGrid',
  component: ConferenceStoryHarness,
  args: { target: 'tile-grid' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
