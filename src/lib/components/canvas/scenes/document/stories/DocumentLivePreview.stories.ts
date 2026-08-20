import type { Meta, StoryObj } from '@storybook/sveltekit'
import DocumentStoryHarness from './DocumentStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Document/DocumentLivePreview',
  component: DocumentStoryHarness,
  args: { target: 'live-preview' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof DocumentStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
