import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import WorkflowStoryHarness from '../../stories/WorkflowStoryHarness.svelte'

const meta = {
  title: 'Desktop/Canvas/Workflows/Panels/WorkflowContextPicker',
  component: WorkflowStoryHarness,
  args: { target: 'context-picker' },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof WorkflowStoryHarness>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: /Workflow context/ })
    )
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      body.getByRole('checkbox', { name: 'Research brief' })
    )
    await expect(canvas.getByTestId('workflow-result')).toHaveTextContent(
      'scene-story'
    )
  }
}
