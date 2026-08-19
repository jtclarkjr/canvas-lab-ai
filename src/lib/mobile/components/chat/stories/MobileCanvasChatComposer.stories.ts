import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import MobileChatStoryHarness from './MobileChatStoryHarness.svelte'

const meta = {
  title: 'Mobile/Canvas/Chat/MobileCanvasChatComposer',
  component: MobileChatStoryHarness,
  args: { target: 'composer' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof MobileChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textbox = canvas.getByRole('textbox', {
      name: 'Message the canvas...'
    })
    await userEvent.type(textbox, '@ad')
    await userEvent.keyboard('{Enter}')
    await expect(textbox).toHaveValue('@Ada Lovelace ')
    await userEvent.type(textbox, 'review this')
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByTestId('sent-message')).toHaveTextContent(
      '@Ada Lovelace review this'
    )
  }
}
