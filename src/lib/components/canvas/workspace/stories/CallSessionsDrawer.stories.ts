import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/CallSessionsDrawer',
  component: WorkspaceStoryHarness,
  args: { target: 'call-sessions' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
