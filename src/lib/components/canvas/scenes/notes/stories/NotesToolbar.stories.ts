import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import NotesStoryHarness from './NotesStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Scenes/Notes/NotesToolbar',
  component: NotesStoryHarness,
  args: { target: 'toolbar' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof NotesStoryHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Pencil' }))
    await expect(canvas.getByTestId('notes-result')).toHaveTextContent('pencil')
    await userEvent.click(canvas.getByRole('button', { name: 'Undo' }))
    await expect(canvas.getByTestId('notes-result')).toHaveTextContent('undo')
  }
}
