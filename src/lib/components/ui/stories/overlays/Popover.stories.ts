import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import PopoverFixture from './Popover.fixture.svelte'

const meta = {
  title: 'UI/Overlays/Popover',
  component: PopoverFixture,
  args: { initialOpen: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof PopoverFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole('button', { name: /Sort:/ })

    await userEvent.click(trigger)
    await waitFor(() =>
      expect(body.getByRole('menu', { name: 'Sort options' })).toBeVisible()
    )
    await userEvent.click(
      body.getByRole('menuitemradio', { name: 'Oldest first' })
    )
    await expect(canvas.getByTestId('selection')).toHaveTextContent(
      'Oldest first'
    )
    await expect(trigger).toHaveFocus()
  }
}

export const Open: Story = { args: { initialOpen: true } }

export const Keyboard: Story = {}
