import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import CanvasIconUploadDialogFixture from './CanvasIconUploadDialog.fixture.svelte'

const meta = {
  title: 'Desktop/Canvas/Home/CanvasIconUploadDialog',
  component: CanvasIconUploadDialogFixture,
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasIconUploadDialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    const input = body.getByLabelText('Choose image')
    const file = new File(['image-bytes'], 'canvas.png', { type: 'image/png' })
    await userEvent.upload(input, file)
    await waitFor(() => expect(body.getByText('canvas.png')).toBeVisible())
    await expect(
      body.getByRole('button', { name: 'Upload icon' })
    ).toBeEnabled()
  }
}
