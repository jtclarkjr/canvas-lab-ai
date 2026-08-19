import type { Meta, StoryObj } from '@storybook/sveltekit'
import NotesStoryHarness from './NotesStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Notes/NotesSceneView',
  component: NotesStoryHarness,
  args: { target: 'view' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof NotesStoryHarness>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
