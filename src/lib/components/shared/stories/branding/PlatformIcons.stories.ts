import type { Meta, StoryObj } from '@storybook/sveltekit'
import PlatformIcons from '../../branding/PlatformIcons.svelte'

const meta = {
  title: 'Shared/Branding/PlatformIcons',
  component: PlatformIcons,
  args: { provider: 'github', size: 'md' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof PlatformIcons>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Small: Story = { args: { size: 'sm' } }
export const Google: Story = { args: { provider: 'google' } }
export const Apple: Story = { args: { provider: 'apple' } }
