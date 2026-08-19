import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/DocumentComposer',
  component: DocumentStoryHarness,
  args: { target: 'composer' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox', {
      name: 'Ask for changes or describe a new document'
    })
    await userEvent.type(input, 'Add a risks section{Enter}')
    await expect(canvas.getByTestId('document-result')).toHaveTextContent(
      'Add a risks section'
    )
  }
}
