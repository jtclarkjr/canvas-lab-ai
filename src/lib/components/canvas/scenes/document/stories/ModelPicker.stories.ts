import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/ModelPicker',
  component: DocumentStoryHarness,
  args: { target: 'model-picker' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /AI model:/ }))
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('menuitemradio', {
        name: /GPT-5.5/
      })
    )
    await expect(canvas.getByTestId('document-result')).toHaveTextContent(
      'openai/gpt-5.5'
    )
  }
}
