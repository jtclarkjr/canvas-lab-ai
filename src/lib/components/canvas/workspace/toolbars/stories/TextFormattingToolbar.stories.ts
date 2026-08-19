import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from '../../stories/WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/Toolbars/TextFormattingToolbar',
  component: WorkspaceStoryHarness,
  args: { target: 'text-toolbar' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
