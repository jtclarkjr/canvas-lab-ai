import type { Meta, StoryObj } from '@storybook/sveltekit'
import { HttpResponse, http } from 'msw'
import { expect, within } from 'storybook/test'
import SettingsAiUsagePanel from '../SettingsAiUsagePanel.svelte'

const usage = {
  limits: [
    {
      id: 'five_hour',
      label: '5-hour limit',
      capTokens: 5000,
      usedTokens: 1850,
      resetsAt: '2099-01-01T05:00:00.000Z'
    },
    {
      id: 'weekly',
      label: 'Weekly limit',
      capTokens: 50000,
      usedTokens: 12750,
      resetsAt: '2099-01-07T00:00:00.000Z'
    }
  ],
  limited: {
    features: ['Canvas Assistant', 'Workflow AI'],
    models: [{ id: 'gpt-5', label: 'GPT-5' }]
  },
  unlimited: {
    features: ['Canvas chat', 'Conference calls'],
    models: [{ id: 'gpt-5-nano', label: 'GPT-5 nano' }]
  },
  lastUpdatedAt: '2026-08-19T12:00:00.000Z'
}

const fixedCurrentTime = new Date('2026-08-19T12:00:00.000Z').getTime()

const meta = {
  title: 'Desktop/Settings/SettingsAiUsagePanel',
  component: SettingsAiUsagePanel,
  args: {
    id: 'settings-ai-panel',
    labelledby: 'settings-ai-tab',
    getCurrentTime: () => fixedCurrentTime
  },
  tags: ['autodocs', 'visual'],
  parameters: {
    msw: {
      handlers: [http.get('/api/ai/usage', () => HttpResponse.json(usage))]
    }
  }
} satisfies Meta<typeof SettingsAiUsagePanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('5-hour limit')).toBeVisible()
    await expect(canvas.getByText('1,850 / 5,000 tokens')).toBeVisible()
  }
}

export const Error: Story = {
  tags: ['expected-console-error'],
  parameters: {
    msw: {
      handlers: [
        http.get('/api/ai/usage', () =>
          HttpResponse.json({ message: 'Usage unavailable' }, { status: 503 })
        )
      ]
    }
  }
}
