import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import CanvasSearchDialogFixture from './CanvasSearchDialog.fixture.svelte'

const meta = {
  title: 'Desktop/Canvas/Search/CanvasSearchDialog',
  component: CanvasSearchDialogFixture,
  args: { loading: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasSearchDialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    const canvas = within(canvasElement)
    const search = body.getByRole('combobox', { name: 'Search canvases' })

    await userEvent.type(search, 'Research')
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByTestId('selected-canvas')).toHaveTextContent(
      'Research synthesis'
    )
  }
}

export const Loading: Story = { args: { loading: true } }
