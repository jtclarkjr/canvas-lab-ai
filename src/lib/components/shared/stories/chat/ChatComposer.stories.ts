import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import ChatComposer from '../../chat/ChatComposer.svelte'

const meta = {
  title: 'Shared/Chat/ChatComposer',
  component: ChatComposer,
  args: {
    density: 'compact',
    placeholder: 'Message the canvas…',
    mentionMembers: [
      { id: 'user-ada', name: 'Ada Lovelace', color: '#7c3aed' },
      { id: 'user-grace', name: 'Grace Hopper', color: '#0369a1' }
    ],
    webSearch: true,
    onWebSearchToggle: fn(),
    onSend: fn()
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ChatComposer>

export default meta
type Story = StoryObj<typeof meta>

export const Compact: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const textbox = canvas.getByRole('textbox', { name: 'Message the canvas…' })
    await userEvent.type(textbox, '@gr')
    await userEvent.keyboard('{Enter}')
    await expect(textbox).toHaveValue('@Grace Hopper ')
    await waitFor(() =>
      expect((textbox as HTMLTextAreaElement).selectionStart).toBe(
        '@Grace Hopper '.length
      )
    )
    await userEvent.type(textbox, 'ship it')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSend).toHaveBeenCalledWith('@Grace Hopper ship it')
  }
}

export const Touch: Story = {
  args: { density: 'touch' }
}
