import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import WorkspaceStoryHarness from '$lib/components/canvas/workspace/stories/WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Toolbars/MobileToolDock',
  component: WorkspaceStoryHarness,
  args: { target: 'mobile-tool-dock' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Pencil' }))
    await expect(canvas.getByTestId('workspace-result')).toHaveTextContent(
      'pencil'
    )
  }
}
