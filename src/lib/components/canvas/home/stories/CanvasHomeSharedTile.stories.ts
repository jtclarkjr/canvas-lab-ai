import type { Meta, StoryObj } from '@storybook/sveltekit'
import CanvasHomeSharedTile from '../CanvasHomeSharedTile.svelte'
import { sharedCanvas } from './fixtures'

const meta = {
  title: 'Desktop/Canvas/Home/CanvasHomeSharedTile',
  component: CanvasHomeSharedTile,
  args: {
    canvas: sharedCanvas,
    isOpening: false,
    isDimmed: false,
    dateLabel: 'Updated',
    dateValue: sharedCanvas.updatedAt,
    onNavigate: () => undefined
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasHomeSharedTile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Opening: Story = { args: { isOpening: true } }
