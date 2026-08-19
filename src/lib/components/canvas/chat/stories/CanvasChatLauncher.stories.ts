import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ChatStoryHarness from './ChatStoryHarness.svelte'
import { chatStoryHandlers } from './chat.msw'

const meta = {
  title: 'Desktop/Canvas/Chat/CanvasChatLauncher',
  component: ChatStoryHarness,
  args: { target: 'launcher' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers } }
} satisfies Meta<typeof ChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OpensChat: Story = {
  args: { fixtureId: 'opens' },
  tags: ['!visual'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open canvas chat' })
    )
    await expect(canvas.getByTestId('store-open')).toHaveTextContent('true')
  }
}
