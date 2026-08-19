import type { Meta, StoryObj } from '@storybook/sveltekit'
import { HttpResponse, http } from 'msw'
import { expect, userEvent, within } from 'storybook/test'
import RequestAccessScreen from '../RequestAccessScreen.svelte'

const request = {
  id: 'request-1',
  canvasId: 'canvas-private',
  status: 'pending',
  requestedRole: 'editor',
  createdAt: '2026-08-19T12:00:00.000Z'
} as const

const meta = {
  title: 'Desktop/Canvas/Access/RequestAccessScreen',
  component: RequestAccessScreen,
  args: { canvasId: 'canvas-private' },
  tags: ['autodocs', 'visual'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/api/canvases/:canvasId/access-requests/me', () =>
          HttpResponse.json({ item: null })
        ),
        http.post('/api/canvases/:canvasId/access-requests', () =>
          HttpResponse.json({ item: request })
        )
      ]
    }
  }
} satisfies Meta<typeof RequestAccessScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = await canvas.findByRole('button', { name: 'Request access' })
    await userEvent.click(button)
    await expect(await canvas.findByText('Request sent')).toBeVisible()
  }
}

export const Pending: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/canvases/:canvasId/access-requests/me', () =>
          HttpResponse.json({ item: request })
        )
      ]
    }
  }
}

export const Denied: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/canvases/:canvasId/access-requests/me', () =>
          HttpResponse.json({ item: { ...request, status: 'denied' } })
        )
      ]
    }
  }
}
