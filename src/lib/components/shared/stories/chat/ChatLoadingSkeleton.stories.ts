import type { Meta, StoryObj } from '@storybook/sveltekit'
import ChatLoadingSkeleton from '../../chat/ChatLoadingSkeleton.svelte'

const meta = {
  title: 'Shared/Chat/ChatLoadingSkeleton',
  component: ChatLoadingSkeleton,
  args: { rows: 4, size: 'sm' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ChatLoadingSkeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {}
export const Mobile: Story = { args: { size: 'md' } }
export const Assistant: Story = { args: { rows: 3 } }
