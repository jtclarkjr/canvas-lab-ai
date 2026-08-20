import type { Meta, StoryObj } from '@storybook/sveltekit'
import { chatStoryHandlers } from '$lib/components/canvas/chat/stories/chat.msw'
import MobileChatStoryHarness from './MobileChatStoryHarness.svelte'

const meta = {
  title: 'Mobile/Canvas/Chat/MobileCanvasChat',
  component: MobileChatStoryHarness,
  args: { target: 'chat' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers }, layout: 'fullscreen' }
} satisfies Meta<typeof MobileChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
