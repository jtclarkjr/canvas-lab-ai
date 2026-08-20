import type { Meta, StoryObj } from '@storybook/sveltekit'
import SkeletonFixture from './Skeleton.fixture.svelte'

const meta = {
  title: 'UI/Feedback/Skeleton',
  component: SkeletonFixture,
  args: { animated: true },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SkeletonFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Static: Story = { args: { animated: false } }
