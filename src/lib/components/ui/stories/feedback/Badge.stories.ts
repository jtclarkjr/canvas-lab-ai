import type { Meta, StoryObj } from '@storybook/sveltekit'
import BadgeFixture from './Badge.fixture.svelte'

const meta = {
  title: 'UI/Feedback/Badge',
  component: BadgeFixture,
  args: { label: 'Editor', variant: 'neutral' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'success', 'warning', 'destructive']
    }
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof BadgeFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Primary: Story = { args: { variant: 'primary' } }
export const Success: Story = {
  args: { variant: 'success', label: 'Connected' }
}
export const Warning: Story = { args: { variant: 'warning', label: 'Pending' } }
export const Destructive: Story = {
  args: { variant: 'destructive', label: 'Blocked' }
}
