import type { Meta, StoryObj } from '@storybook/sveltekit'
import CanvasTilePreviewFixture from './CanvasTilePreview.fixture.svelte'

const meta = {
  title: 'Desktop/Canvas/Home/CanvasTilePreview',
  component: CanvasTilePreviewFixture,
  args: { withImage: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CanvasTilePreviewFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithImage: Story = { args: { withImage: true } }
