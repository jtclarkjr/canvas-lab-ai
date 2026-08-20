import type { Meta, StoryObj } from '@storybook/sveltekit'
import CardFixture from './Card.fixture.svelte'

const meta = {
  title: 'UI/Layout/Card',
  component: CardFixture,
  args: {
    variant: 'default',
    padding: 'md',
    interactive: false,
    selected: false,
    asChild: false
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof CardFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Interactive: Story = { args: { interactive: true } }
export const Selected: Story = { args: { interactive: true, selected: true } }
export const Glass: Story = { args: { variant: 'glass' } }
export const LinkedElement: Story = {
  args: { asChild: true, interactive: true }
}
