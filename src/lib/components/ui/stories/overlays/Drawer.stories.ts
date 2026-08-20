import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import DrawerFixture from './Drawer.fixture.svelte'

const meta = {
  title: 'UI/Overlays/Drawer',
  component: DrawerFixture,
  args: { initialOpen: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DrawerFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole('button', { name: 'Open activity drawer' })
    trigger.focus()
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(
        body.getByRole('dialog', { name: 'Canvas activity' })
      ).toBeVisible()
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        body.queryByRole('dialog', { name: 'Canvas activity' })
      ).not.toBeInTheDocument()
    )
    await expect(trigger).toHaveFocus()
  }
}

export const Open: Story = { args: { initialOpen: true } }
export const Wide: Story = {
  args: { initialOpen: true, widthClass: 'w-[min(44rem,100vw)]' }
}
