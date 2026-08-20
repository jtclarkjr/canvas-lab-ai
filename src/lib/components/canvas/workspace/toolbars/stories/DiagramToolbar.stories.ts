import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from '../../stories/WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/Toolbars/DiagramToolbar',
  component: WorkspaceStoryHarness,
  args: { target: 'diagram-toolbar' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
