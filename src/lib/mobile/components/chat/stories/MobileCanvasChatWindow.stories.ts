import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { chatStoryHandlers } from '$lib/components/canvas/chat/stories/chat.msw'
import MobileChatStoryHarness from './MobileChatStoryHarness.svelte'

const meta = {
  title: 'Mobile/Canvas/Chat/MobileCanvasChatWindow',
  component: MobileChatStoryHarness,
  args: { target: 'window' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers }, layout: 'fullscreen' }
} satisfies Meta<typeof MobileChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Closes: Story = {
  args: { fixtureId: 'closes' },
  tags: ['!visual'],
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      body.getByRole('button', { name: 'Close canvas chat' })
    )
    await waitFor(() =>
      expect(
        body.queryByRole('dialog', { name: 'Canvas chat' })
      ).not.toBeInTheDocument()
    )
  }
}
