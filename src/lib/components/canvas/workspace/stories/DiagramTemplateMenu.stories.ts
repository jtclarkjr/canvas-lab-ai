import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/DiagramTemplateMenu',
  component: WorkspaceStoryHarness,
  args: { target: 'template-menu' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByRole('menuitem')[0])
    await expect(canvas.getByTestId('workspace-result')).not.toHaveTextContent(
      /^$/
    )
  }
}
