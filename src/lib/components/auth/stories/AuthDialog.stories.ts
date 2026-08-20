import type { Meta, StoryObj } from '@storybook/sveltekit'
import AuthDialogFixture from './AuthDialog.fixture.svelte'

const meta = {
  title: 'Desktop/Auth/AuthDialog',
  component: AuthDialogFixture,
  args: { initialOpen: true },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof AuthDialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Closed: Story = { args: { initialOpen: false } }
