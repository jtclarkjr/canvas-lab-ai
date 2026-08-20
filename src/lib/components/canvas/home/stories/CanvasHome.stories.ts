import type { Meta, StoryObj } from '@storybook/sveltekit'
import { HttpResponse, http } from 'msw'
import { expect, within } from 'storybook/test'
import CanvasHome from '../CanvasHome.svelte'
import { ownerCanvas, sharedCanvas } from './fixtures'

const canvases = [ownerCanvas, sharedCanvas]

const meta = {
  title: 'Desktop/Canvas/Home/CanvasHome',
  component: CanvasHome,
  args: {
    initialCanvases: canvases,
    initialError: null,
    user: { id: 'story-user', isAnonymous: false }
  },
  tags: ['autodocs', 'visual'],
  parameters: {
    layout: 'fullscreen',
    sveltekit_experimental: {
      stores: {
        page: {
          data: {},
          url: new URL('https://example.test/home')
        }
      }
    },
    msw: {
      handlers: [
        http.get('/api/canvases', () => HttpResponse.json({ items: canvases }))
      ]
    }
  }
} satisfies Meta<typeof CanvasHome>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText('Product discovery')).toBeVisible()
    await expect(canvas.getByText('Research synthesis')).toBeVisible()
  }
}

export const Empty: Story = {
  args: { initialCanvases: [] },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/canvases', () => HttpResponse.json({ items: [] }))
      ]
    }
  }
}

export const Error: Story = {
  tags: ['expected-console-error'],
  args: { initialCanvases: [], initialError: 'Could not load canvases.' },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/canvases', () =>
          HttpResponse.json(
            { message: 'Could not load canvases.' },
            { status: 500 }
          )
        )
      ]
    }
  }
}
