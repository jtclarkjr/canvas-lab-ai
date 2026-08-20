import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import { chatStoryHandlers } from './chat.msw'
import ChatStoryHarness from './ChatStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Chat/CanvasAssistantHistorySidebar',
  component: ChatStoryHarness,
  args: { target: 'assistant-history' },
  tags: ['autodocs', 'visual'],
  parameters: { msw: { handlers: chatStoryHandlers } }
} satisfies Meta<typeof ChatStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Rename: Story = {
  args: { fixtureId: 'rename' },
  tags: ['!visual'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rename = await canvas.findByRole('button', {
      name: 'Rename Research synthesis'
    })
    await userEvent.click(rename)
    const input = canvas.getByRole('textbox', { name: 'Rename assistant chat' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Evidence review{Enter}')
    await expect(await canvas.findByText('Evidence review')).toBeVisible()
  }
}
