import type { Meta, StoryObj } from '@storybook/sveltekit'
import { HttpResponse, http } from 'msw'
import SettingsDialogFixture from './SettingsDialog.fixture.svelte'

const user = {
  id: 'story-user',
  email: 'ada@example.com',
  user_metadata: { name: 'Ada Lovelace' },
  is_anonymous: false
}

const meta = {
  title: 'Desktop/Settings/SettingsDialog',
  component: SettingsDialogFixture,
  args: { activeTab: 'general' },
  tags: ['autodocs', 'visual'],
  parameters: {
    sveltekit_experimental: {
      stores: {
        page: {
          data: { user },
          url: new URL('https://example.test/home')
        }
      }
    },
    msw: {
      handlers: [
        http.get('/api/ai/usage', () =>
          HttpResponse.json({
            limits: [],
            limited: { features: [], models: [] },
            unlimited: { features: [], models: [] },
            lastUpdatedAt: '2026-08-19T12:00:00.000Z'
          })
        )
      ]
    }
  }
} satisfies Meta<typeof SettingsDialogFixture>

export default meta
type Story = StoryObj<typeof meta>

export const General: Story = {}
export const AiUsage: Story = { args: { activeTab: 'ai-usage' } }
