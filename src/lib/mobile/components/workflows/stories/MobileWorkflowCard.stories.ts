import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from '$lib/components/canvas/workflows/stories/WorkflowStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Workflows/MobileWorkflowCard',
  component: WorkflowStoryHarness,
  args: { target: 'mobile-card' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
