import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import Textarea from '../../forms/Textarea.svelte'

const meta = {
  title: 'UI/Forms/Textarea',
  component: Textarea,
  args: {
    'aria-label': 'Message',
    placeholder: 'Write a message…',
    value: ''
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(input, 'Hello team')
    await expect(input).toHaveValue('Hello team')
  }
}

export const LongContent: Story = {
  args: {
    value:
      'A longer block of content verifies wrapping, vertical rhythm, and resizing behavior in isolation.'
  }
}

export const Invalid: Story = {
  args: { invalid: true, value: 'Needs attention' }
}
