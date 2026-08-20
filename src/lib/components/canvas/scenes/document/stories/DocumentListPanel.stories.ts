import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/DocumentListPanel',
  component: DocumentStoryHarness,
  args: { target: 'list-panel' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'New draft' }))
    await expect(canvas.getByTestId('document-result')).toHaveTextContent(
      'new-draft'
    )
  }
}
