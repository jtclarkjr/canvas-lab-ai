import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from '../../stories/WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/Database/DatabaseGraph',
  component: WorkflowStoryHarness,
  args: { target: 'database-graph' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
