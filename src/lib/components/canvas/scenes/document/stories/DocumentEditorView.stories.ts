import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/DocumentEditorView',
  component: DocumentStoryHarness,
  args: { target: 'editor' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const title = canvas.getByRole('textbox', { name: 'Document title' })
    await userEvent.clear(title)
    await userEvent.type(title, 'Updated brief')
    await userEvent.click(canvas.getByRole('button', { name: 'Save now' }))
    await expect(canvas.getByTestId('document-result')).toHaveTextContent(
      'Updated brief|'
    )
  }
}
