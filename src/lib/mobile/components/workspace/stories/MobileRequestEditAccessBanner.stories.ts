import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, within } from 'storybook/test'
import MobileWorkspaceStoryHarness from './MobileWorkspaceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Workspace/MobileRequestEditAccessBanner',
  component: MobileWorkspaceStoryHarness,
  args: { target: 'request-access' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof MobileWorkspaceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Limited view only')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fcanvas%2Fcanvas-mobile-story'
    )
  }
}
