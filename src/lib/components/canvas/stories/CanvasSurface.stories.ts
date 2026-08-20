import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, within } from 'storybook/test'
import CanvasSurfaceFixture from './CanvasSurface.fixture.svelte'

const meta = {
  title: 'Desktop/Canvas/Surface/CanvasSurface',
  component: CanvasSurfaceFixture,
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasSurfaceFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole('img', { name: 'Drawing canvas' })
    ).toBeVisible()
  }
}
