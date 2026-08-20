import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkflowStoryHarness from '../../stories/WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/Panels/WorkflowDraggablePanel',
  component: WorkflowStoryHarness,
  args: { target: 'draggable-panel' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
