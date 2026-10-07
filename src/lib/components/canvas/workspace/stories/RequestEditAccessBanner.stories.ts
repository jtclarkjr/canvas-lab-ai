import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, within } from 'storybook/test'
import WorkspaceStoryHarness from './WorkspaceStoryHarness.svelte'
const meta = {
  title: 'Desktop/Canvas/Workspace/RequestEditAccessBanner',
  component: WorkspaceStoryHarness,
  args: { target: 'request-access' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Limited view only')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fcanvas%2Fcanvas-story'
    )
  }
}
