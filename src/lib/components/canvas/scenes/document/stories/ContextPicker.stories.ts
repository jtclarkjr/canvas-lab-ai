import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/ContextPicker',
  component: DocumentStoryHarness,
  args: { target: 'context-picker' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Add context documents' })
    )
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('menuitemcheckbox', {
        name: 'Launch checklist'
      })
    )
    await expect(canvas.getByTestId('document-result')).toHaveTextContent(
      'document-saved'
    )
  }
}
