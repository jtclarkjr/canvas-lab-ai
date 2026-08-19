import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import { chatStoryHandlers } from '$lib/components/canvas/chat/stories/chat.msw'
import MobileChatStoryHarness from './MobileChatStoryHarness.svelte'

const meta = {
  title: 'Mobile/Canvas/Chat/MobileCanvasAssistantPanel',
  component: MobileChatStoryHarness,
  args: { target: 'assistant-panel' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers } }
} satisfies Meta<typeof MobileChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OpensHistories: Story = {
  args: { fixtureId: 'histories' },
  tags: ['!visual'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open assistant histories' })
    )
    await expect(await canvas.findByText('Canvas histories')).toBeVisible()
  }
}
