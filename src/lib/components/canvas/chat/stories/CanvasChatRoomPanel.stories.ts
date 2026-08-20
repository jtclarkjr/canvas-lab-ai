import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import { chatStoryHandlers } from './chat.msw'
import ChatStoryHarness from './ChatStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Chat/CanvasChatRoomPanel',
  component: ChatStoryHarness,
  args: { target: 'room-panel' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers } }
} satisfies Meta<typeof ChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('@James')).toBeVisible()
    const textbox = canvas.getByRole('textbox', { name: 'Message the canvas…' })
    await userEvent.type(textbox, 'New update')
    await userEvent.keyboard('{Enter}')
    await expect(await canvas.findByText('New update')).toBeVisible()
  }
}
