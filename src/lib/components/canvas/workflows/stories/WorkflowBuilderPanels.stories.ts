import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from './WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/WorkflowBuilderPanels',
  component: WorkflowStoryHarness,
  args: { target: 'builder-panels' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
