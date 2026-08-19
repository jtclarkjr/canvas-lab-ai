import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import TextEditorFixture from './TextEditor.fixture.svelte'

const meta = {
  title: 'Shared/Editors/TextEditor',
  component: TextEditorFixture,
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof TextEditorFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const editor = canvas.getByRole('textbox', { name: 'Edit text' })

    await userEvent.clear(editor)
    await userEvent.type(editor, 'Updated copy')
    await expect(editor).toHaveValue('Updated copy')
  }
}
