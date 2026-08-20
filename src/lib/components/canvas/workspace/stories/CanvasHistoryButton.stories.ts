import type { Meta, StoryObj } from '@storybook/sveltekit'
import { userEvent, within } from 'storybook/test'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/CanvasHistoryButton',
  component: WorkspaceStoryHarness,
  args: { target: 'history-button' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Open canvas history' })
    )
  }
}
