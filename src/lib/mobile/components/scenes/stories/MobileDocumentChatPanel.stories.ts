import type { Meta, StoryObj } from '@storybook/sveltekit'
import SceneStoryHarness from '$lib/components/canvas/scenes/stories/SceneStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Scenes/MobileDocumentChatPanel',
  component: SceneStoryHarness,
  args: { target: 'mobile-document-chat' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
