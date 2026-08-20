import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import Select from '../../forms/Select.svelte'

const options = [
  { value: 'reader', label: 'Reader' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' }
]

const meta = {
  title: 'UI/Forms/Select',
  component: Select,
  args: {
    'aria-label': 'Canvas role',
    options,
    value: 'reader'
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const select = canvas.getByRole('combobox', { name: 'Canvas role' })
    await userEvent.selectOptions(select, 'editor')
    await expect(select).toHaveValue('editor')
  }
}

export const Disabled: Story = { args: { disabled: true } }

export const Invalid: Story = { args: { invalid: true } }
