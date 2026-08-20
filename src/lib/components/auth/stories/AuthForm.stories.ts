import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import AuthForm from '../AuthForm.svelte'

const configured = {
  configured: true,
  providers: { email: true, github: true, google: true, apple: true }
} as const

const meta = {
  title: 'Desktop/Auth/AuthForm',
  component: AuthForm,
  args: { authConfig: configured, redirectTo: '/home' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof AuthForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('tab', { name: 'Create Account' }))
    await userEvent.type(canvas.getByLabelText('Name'), 'Ada Lovelace')
    await userEvent.type(canvas.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(canvas.getByLabelText('Password'), 'safe-password')
    await expect(canvas.getByLabelText('Email')).toHaveValue('ada@example.com')
  }
}

export const EmailOnly: Story = {
  args: {
    authConfig: {
      configured: true,
      providers: { email: true, github: false, google: false, apple: false }
    }
  }
}

export const Unconfigured: Story = {
  args: {
    authConfig: {
      configured: false,
      providers: { email: false, github: false, google: false, apple: false }
    }
  }
}
