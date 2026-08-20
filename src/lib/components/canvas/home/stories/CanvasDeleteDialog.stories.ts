import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import CanvasDeleteDialogFixture from './CanvasDeleteDialog.fixture.svelte'

const meta = {
  title: 'Desktop/Canvas/Home/CanvasDeleteDialog',
  component: CanvasDeleteDialogFixture,
  args: { deleting: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasDeleteDialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    const canvas = within(canvasElement)
    await userEvent.click(body.getByRole('button', { name: 'Delete canvas' }))
    await expect(canvas.getByTestId('confirmed')).toHaveTextContent('yes')
  }
}

export const Deleting: Story = { args: { deleting: true } }
