import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ChatStoryHarness from './ChatStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Chat/CanvasChatComposer',
  component: ChatStoryHarness,
  args: { target: 'composer' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textbox = canvas.getByRole('textbox', { name: 'Message the canvas…' })
    await userEvent.type(textbox, '@ad')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(textbox, 'please review this')
    await userEvent.click(canvas.getByRole('button', { name: 'Send message' }))
    await expect(canvas.getByTestId('sent-message')).toHaveTextContent(
      '@Ada Lovelace please review this'
    )
  }
}
