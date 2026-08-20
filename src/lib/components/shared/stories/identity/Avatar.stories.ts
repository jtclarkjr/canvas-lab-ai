import type { Meta, StoryObj } from '@storybook/sveltekit'
import Avatar from '../../identity/Avatar.svelte'

const meta = {
  title: 'Shared/Identity/Avatar',
  component: Avatar,
  args: {
    name: 'Alex Morgan',
    class: 'size-14 text-sm',
    decorative: false
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}
export const CustomFallback: Story = { args: { fallback: 'YOU' } }
export const ParticipantColor: Story = {
  args: {
    color: '#7c3aed',
    class: 'size-14 text-sm text-white'
  }
}
export const BrokenImageFallback: Story = {
  args: { src: '/missing-avatar-for-fallback.png' },
  tags: ['!visual']
}
