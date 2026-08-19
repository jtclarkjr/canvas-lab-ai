import type { Meta, StoryObj } from '@storybook/sveltekit'
import { expect, userEvent, within } from 'storybook/test'
import SettingsGeneralPanel from '../SettingsGeneralPanel.svelte'

const meta = {
  title: 'Desktop/Settings/SettingsGeneralPanel',
  component: SettingsGeneralPanel,
  args: {
    id: 'settings-general-panel',
    labelledby: 'settings-general-tab',
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
    avatarUrl: null,
    initial: 'A'
  },
  tags: ['autodocs', 'visual']
} satisfies Meta<typeof SettingsGeneralPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(canvas.getByLabelText('Select theme'), 'dark')
    await expect(canvas.getByLabelText('Select theme')).toHaveValue('dark')
  }
}

export const WithAvatar: Story = {
  args: {
    avatarUrl:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%237c3aed"/%3E%3C/svg%3E'
  }
}
