import type { Meta, StoryObj } from '@storybook/sveltekit'
import { HttpResponse, http } from 'msw'
import { expect, fn, userEvent, within } from 'storybook/test'
import CanvasHome from '../CanvasHome.svelte'
import { ownerCanvas, sharedCanvas } from './fixtures'

const canvases = [ownerCanvas, sharedCanvas]
const navigate = fn()
const sortingUrl = new URL('https://example.test/home?filter=owned#canvases')

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
      state: {
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

export const Sorting: Story = {
  tags: ['!visual'],
  beforeEach: () => {
    navigate.mockClear()
  },
  parameters: {
    sveltekit_experimental: {
      state: { page: { url: sortingUrl } },
      navigation: { goto: navigate }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sorting = within(canvas.getByRole('group', { name: 'Sort canvases' }))
    const title = sorting.getByRole('button', { name: 'Title' })
    await userEvent.click(title)
    await expect(navigate).toHaveBeenCalledWith(
      '/home?filter=owned&sort=title&dir=asc#canvases',
      { replace: true, reset: false }
    )
    await expect(title).toHaveFocus()
    await expect(sortingUrl.searchParams.has('sort')).toBe(false)
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
