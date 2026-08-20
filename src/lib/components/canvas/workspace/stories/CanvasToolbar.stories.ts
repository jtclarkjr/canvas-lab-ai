import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/CanvasToolbar',
  component: WorkspaceStoryHarness,
  args: { target: 'toolbar' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Drawing tools/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Pencil' }))
    await expect(canvas.getByTestId('workspace-result')).toHaveTextContent(
      'pencil'
    )
  }
}
