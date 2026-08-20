import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import ToastViewportFixture from './ToastViewport.fixture.svelte'

const meta = {
  title: 'Shared/Feedback/ToastViewport',
  component: ToastViewportFixture,
  args: { variant: 'default', withAction: true },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ToastViewportFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)

    await userEvent.click(body.getByRole('button', { name: 'Undo' }))
    await expect(canvas.getByTestId('action-count')).toHaveTextContent(
      'Actions: 1'
    )
    await waitFor(() =>
      expect(body.queryByRole('status')).not.toBeInTheDocument()
    )
  }
}

export const Error: Story = { args: { variant: 'error', withAction: false } }
