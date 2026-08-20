import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from '$lib/components/canvas/workspace/stories/WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Toolbars/MobileDrawingToolbar',
  component: WorkspaceStoryHarness,
  args: { target: 'mobile-drawing-toolbar' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
