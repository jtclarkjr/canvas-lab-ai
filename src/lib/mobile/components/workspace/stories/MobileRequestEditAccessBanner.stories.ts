import type { Meta, StoryObj } from '@storybook/sveltekit'
import MobileWorkspaceStoryHarness from './MobileWorkspaceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Workspace/MobileRequestEditAccessBanner',
  component: MobileWorkspaceStoryHarness,
  args: { target: 'request-access' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof MobileWorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
