import type { Meta, StoryObj } from '@storybook/sveltekit'
import CanvasHomeOwnedTileFixture from './CanvasHomeOwnedTile.fixture.svelte'

const meta = {
  title: 'Desktop/Canvas/Home/CanvasHomeOwnedTile',
  component: CanvasHomeOwnedTileFixture,
  args: { initialEditing: false, initialMenuOpen: false, isOpening: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasHomeOwnedTileFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const MenuOpen: Story = { args: { initialMenuOpen: true } }
export const Renaming: Story = { args: { initialEditing: true } }
export const Opening: Story = { args: { isOpening: true } }
