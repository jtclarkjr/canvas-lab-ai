import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from './WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/WorkflowFrame',
  component: WorkflowStoryHarness,
  args: { target: 'frame' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
