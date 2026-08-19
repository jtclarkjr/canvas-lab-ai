import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/CanvasHistoryDrawer',
  component: WorkspaceStoryHarness,
  args: { target: 'history-drawer' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
