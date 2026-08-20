import type { Meta, StoryObj } from '@storybook/sveltekit'
import { chatStoryHandlers } from './chat.msw'
import ChatStoryHarness from './ChatStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Chat/CanvasChatWindow',
  component: ChatStoryHarness,
  args: { target: 'window' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers } }
} satisfies Meta<typeof ChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
