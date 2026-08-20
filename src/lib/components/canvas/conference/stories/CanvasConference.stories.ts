import type { Meta, StoryObj } from '@storybook/sveltekit'
import ConferenceStoryHarness from './ConferenceStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Conference/CanvasConference',
  component: ConferenceStoryHarness,
  args: { target: 'canvas-conference' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
