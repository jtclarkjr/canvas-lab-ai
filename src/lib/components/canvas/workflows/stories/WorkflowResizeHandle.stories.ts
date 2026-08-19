import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, fireEvent, within } from 'storybook/test'
import WorkflowStoryHarness from './WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/WorkflowResizeHandle',
  component: WorkflowStoryHarness,
  args: { target: 'resize-handle' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await fireEvent.pointerDown(
      canvas.getByRole('button', { name: 'Resize workflow' })
    )
    await expect(canvas.getByTestId('workflow-result')).toHaveTextContent(
      'resize:workflow-story'
    )
  }
}
