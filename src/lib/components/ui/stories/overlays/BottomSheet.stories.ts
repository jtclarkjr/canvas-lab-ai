import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import BottomSheetFixture from './BottomSheet.fixture.svelte'

const meta = {
  title: 'UI/Overlays/BottomSheet',
  component: BottomSheetFixture,
  args: { initialOpen: false },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof BottomSheetFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open mobile details' })
    )
    await waitFor(() =>
      expect(body.getByRole('dialog', { name: 'Mobile details' })).toBeVisible()
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        body.queryByRole('dialog', { name: 'Mobile details' })
      ).not.toBeInTheDocument()
    )
  }
}

export const Open: Story = { args: { initialOpen: true } }
