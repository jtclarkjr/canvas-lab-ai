import type { Meta, StoryObj } from '@storybook/sveltekit'
import SceneStoryHarness from '$lib/components/canvas/scenes/stories/SceneStoryHarness.svelte'
const meta = {
  title: 'Mobile/Canvas/Scenes/MobileSceneCardLayer',
  component: SceneStoryHarness,
  args: { target: 'mobile-card-layer' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SceneStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
