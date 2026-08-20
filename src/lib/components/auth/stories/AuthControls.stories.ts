import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, within } from 'storybook/test'
import AuthControls from '../AuthControls.svelte'

const meta = {
  title: 'Desktop/Auth/AuthControls',
  component: AuthControls,
  tags: ['autodocs', 'visual'],
  parameters: {
    sveltekit_experimental: {
      stores: {
        page: {
          data: { user: null },
          url: new URL('https://example.test/home')
        }
      }
    }
  }
} satisfies Meta<typeof AuthControls>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?redirect=%2F'
    )
  }
}
