import type { Meta, StoryObj } from '@storybook/sveltekit'
import MobileWorkspaceStoryHarness from './MobileWorkspaceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Workspace/MobileCanvasWorkspaceView',
  component: MobileWorkspaceStoryHarness,
  args: { target: 'view' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof MobileWorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
