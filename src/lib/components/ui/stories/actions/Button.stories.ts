import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ButtonFixture from './Button.fixture.svelte'

const meta = {
  title: 'UI/Actions/Button',
  component: ButtonFixture,
  args: {
    label: 'Save changes',
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon']
    }
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ButtonFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }))
    await expect(canvas.getByText('Pressed 1 times')).toBeVisible()
  }
}

export const Secondary: Story = {
  args: { variant: 'secondary', label: 'Cancel' }
}

export const Destructive: Story = {
  args: { variant: 'destructive', label: 'Delete canvas' }
}

export const Loading: Story = {
  args: { loading: true }
}

export const Disabled: Story = {
  args: { disabled: true }
}
