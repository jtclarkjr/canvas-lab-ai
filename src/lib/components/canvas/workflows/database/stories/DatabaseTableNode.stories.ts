import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from '../../stories/WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/Database/DatabaseTableNode',
  component: WorkflowStoryHarness,
  args: { target: 'database-table-node' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
