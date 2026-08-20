import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import ConferenceStoryHarness from '$lib/components/canvas/conference/stories/ConferenceStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Conference/MobileConferenceFullscreen',
  component: ConferenceStoryHarness,
  args: { target: 'mobile-fullscreen' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof ConferenceStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const fullscreen = body.getByRole('dialog', { name: 'Call' })
    const fullscreenLayer = Number.parseInt(
      getComputedStyle(fullscreen).zIndex,
      10
    )

    await userEvent.click(
      canvas.getByRole('button', { name: 'People in call' })
    )

    const sheet = await body.findByRole('dialog', { name: /^People/ })
    const sheetLayer = Number.parseInt(getComputedStyle(sheet).zIndex, 10)
    await expect(sheetLayer).toBeGreaterThan(fullscreenLayer)
  }
}
