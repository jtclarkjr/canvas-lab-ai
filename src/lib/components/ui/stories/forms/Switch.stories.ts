import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import Switch from '../../forms/Switch.svelte'

const meta = {
  title: 'UI/Forms/Switch',
  component: Switch,
  args: {
    label: 'Publish canvas',
    checked: false
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const control = canvas.getByRole('switch', { name: 'Publish canvas' })
    await expect(control).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(control)
    await expect(control).toHaveAttribute('aria-checked', 'true')
  }
}

export const Checked: Story = { args: { checked: true } }

export const Disabled: Story = { args: { disabled: true } }

export const Keyboard: Story = {}
