import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import { chatStoryHandlers } from '$lib/components/canvas/chat/stories/chat.msw'
import MobileChatStoryHarness from './MobileChatStoryHarness.svelte'

const meta = {
  title: 'Mobile/Canvas/Chat/MobileCanvasChatRoomPanel',
  component: MobileChatStoryHarness,
  args: { target: 'room-panel' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers } }
} satisfies Meta<typeof MobileChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('@James')).toBeVisible()
    const textbox = canvas.getByRole('textbox', {
      name: 'Message the canvas...'
    })
    await userEvent.type(textbox, 'Mobile update{Enter}')
    await expect(await canvas.findByText('Mobile update')).toBeVisible()
  }
}
