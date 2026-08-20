import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/LiveCursors',
  component: WorkspaceStoryHarness,
  args: { target: 'live-cursors' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
