import type { Meta, StoryObj } from '@storybook/sveltekit'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/CanvasTitleSwitcher',
  component: WorkspaceStoryHarness,
  args: { target: 'title-switcher' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
