import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import ConfirmDialogFixture from './ConfirmDialog.fixture.svelte'

const meta = {
  title: 'Shared/Feedback/ConfirmDialog',
  component: ConfirmDialogFixture,
  args: { initialOpen: false, destructive: true },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConfirmDialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)

    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove collaborator' })
    )
    await waitFor(() =>
      expect(
        body.getByRole('dialog', { name: 'Remove collaborator?' })
      ).toBeVisible()
    )
    await userEvent.click(body.getByRole('button', { name: 'Remove' }))
    await expect(canvas.getByTestId('decision')).toHaveTextContent('Confirmed')
  }
}

export const Open: Story = { args: { initialOpen: true } }
export const Behavior: Story = {}
export const NonDestructive: Story = {
  args: { initialOpen: true, destructive: false }
}
