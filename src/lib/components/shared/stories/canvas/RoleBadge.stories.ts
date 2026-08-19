import type { Meta, StoryObj } from '@storybook/sveltekit'
import RoleBadge from '../../canvas/RoleBadge.svelte'

const meta = {
  title: 'Shared/Canvas/RoleBadge',
  component: RoleBadge,
  args: { role: 'owner' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof RoleBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Admin: Story = { args: { role: 'admin' } }
export const Editor: Story = { args: { role: 'editor' } }
export const Reader: Story = { args: { role: 'reader' } }
