import type { Meta, StoryObj } from '@storybook/sveltekit'
import { userEvent, within } from 'storybook/test'
import WorkspaceStoryHarness from '$lib/components/canvas/workspace/stories/WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Navigation/MobileTopMenu',
  component: WorkspaceStoryHarness,
  args: { target: 'mobile-top-menu' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: /menu/i })
    await userEvent.click(button)
  }
}
