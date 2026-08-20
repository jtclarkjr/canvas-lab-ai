import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import Input from '../../forms/Input.svelte'

const meta = {
  title: 'UI/Forms/Input',
  component: Input,
  args: {
    'aria-label': 'Canvas title',
    placeholder: 'Untitled canvas',
    value: ''
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox', { name: 'Canvas title' })
    await userEvent.type(input, 'Roadmap')
    await expect(input).toHaveValue('Roadmap')
  }
}

export const Invalid: Story = {
  args: { invalid: true, value: 'Invalid value' }
}

export const Disabled: Story = {
  args: { disabled: true, value: 'Read only' }
}
