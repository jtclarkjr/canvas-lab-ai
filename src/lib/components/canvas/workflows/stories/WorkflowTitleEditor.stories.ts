import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import WorkflowStoryHarness from './WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/WorkflowTitleEditor',
  component: WorkflowStoryHarness,
  args: { target: 'title-editor' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Rename workflow' })
    )
    const input = canvas.getByRole('textbox', { name: 'Workflow title' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Evidence workflow{Enter}')
    await expect(canvas.getByTestId('workflow-result')).toHaveTextContent(
      'Evidence workflow'
    )
  }
}
