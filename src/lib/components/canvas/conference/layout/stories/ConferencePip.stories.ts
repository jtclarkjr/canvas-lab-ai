import type { Meta, StoryObj } from '@storybook/sveltekit'
import ConferenceStoryHarness from '../../stories/ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/Layout/ConferencePip',
  component: ConferenceStoryHarness,
  args: { target: 'pip' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
