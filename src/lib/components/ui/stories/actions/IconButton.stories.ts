import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import IconButtonFixture from './IconButton.fixture.svelte'

const meta = {
  title: 'UI/Actions/IconButton',
  component: IconButtonFixture,
  args: { label: 'Open settings', disabled: false },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof IconButtonFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Open settings' }))
    await expect(canvas.getByText('Pressed 1 times')).toBeVisible()
  }
}

export const Disabled: Story = { args: { disabled: true } }
