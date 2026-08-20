import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import SegmentedControl from '../../navigation/SegmentedControl.svelte'

const meta = {
  title: 'UI/Navigation/SegmentedControl',
  component: SegmentedControl,
  args: {
    value: 'canvas',
    label: 'Content view',
    items: [
      { value: 'canvas', label: 'Canvas' },
      { value: 'scenes', label: 'Scenes' },
      { value: 'workflow', label: 'Workflow' }
    ]
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const canvasTab = canvas.getByRole('tab', { name: 'Canvas' })
    const scenesTab = canvas.getByRole('tab', { name: 'Scenes' })
    await expect(canvasTab).toHaveAttribute('aria-selected', 'true')
    canvasTab.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(scenesTab).toHaveAttribute('aria-selected', 'true')
  }
}

export const Small: Story = { args: { size: 'sm' } }
export const DisabledItem: Story = {
  args: {
    items: [
      { value: 'canvas', label: 'Canvas' },
      { value: 'scenes', label: 'Scenes', disabled: true },
      { value: 'workflow', label: 'Workflow' }
    ]
  }
}
