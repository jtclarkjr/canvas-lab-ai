import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, within } from 'storybook/test'
import VirtualizedMessageListFixture from './VirtualizedMessageList.fixture.svelte'

const meta = {
  title: 'Shared/Collections/VirtualizedMessageList',
  component: VirtualizedMessageListFixture,
  args: { count: 100 },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof VirtualizedMessageListFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Message 1')).toBeVisible()
    const renderedRows = canvasElement.querySelectorAll('[data-index]')
    await expect(renderedRows.length).toBeGreaterThan(0)
    await expect(renderedRows.length).toBeLessThan(100)
  }
}

export const Empty: Story = { args: { count: 0 } }
