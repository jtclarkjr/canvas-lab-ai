import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import DialogFixture from './Dialog.fixture.svelte'

const meta = {
  title: 'UI/Overlays/Dialog',
  component: DialogFixture,
  args: {
    initialOpen: false,
    title: 'Invite collaborators',
    description: 'Choose who can access this canvas.',
    showClose: true,
    closeOnOutside: true
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole('button', { name: 'Open dialog' })

    trigger.focus()
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(
        body.getByRole('dialog', { name: 'Invite collaborators' })
      ).toBeVisible()
    )
    await expect(
      body.getByRole('button', { name: 'Close dialog' })
    ).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        body.queryByRole('dialog', { name: 'Invite collaborators' })
      ).not.toBeInTheDocument()
    )
    await expect(trigger).toHaveFocus()
  }
}

export const Open: Story = { args: { initialOpen: true } }

export const Keyboard: Story = {}

export const LongContent: Story = {
  args: {
    initialOpen: true,
    title: 'A deliberately long dialog title that verifies truncation',
    description:
      'Long descriptions verify wrapping and spacing without changing the underlying dialog behavior.'
  }
}

export const RequiredDecision: Story = {
  args: { initialOpen: true, closeOnOutside: false, showClose: false }
}
