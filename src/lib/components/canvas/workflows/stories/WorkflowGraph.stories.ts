import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from './WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/WorkflowGraph',
  component: WorkflowStoryHarness,
  args: { target: 'graph' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
