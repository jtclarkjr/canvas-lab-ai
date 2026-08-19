import type { Preview } from '@storybook/sveltekit'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { http, HttpResponse } from 'msw'
import '../src/app.css'

const preview: Preview = {
  loaders: [mswLoader()],
  globalTypes: {
    theme: {
      description: 'Application color theme',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' }
        ],
        dynamicTitle: true
      }
    }
  },
  initialGlobals: {
    theme: 'light'
  },
  decorators: [
    (story, context) => {
      if (typeof document !== 'undefined') {
        const dark = context.globals.theme === 'dark'
        document.documentElement.classList.toggle('dark', dark)
        document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      }
      return story()
    }
  ],
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/canvases/:canvasId/conference', () =>
          HttpResponse.json({
            active: false,
            count: 0,
            participants: [],
            callSession: null
          })
        ),
        http.get('*/api/canvases/:canvasId/call-sessions', () =>
          HttpResponse.json({ items: [] })
        ),
        http.get('*/api/canvases/:canvasId/history', () =>
          HttpResponse.json({ items: [], nextBefore: null })
        ),
        http.get('*/api/canvases/:canvasId/members', () =>
          HttpResponse.json({ items: [] })
        ),
        http.get('*/api/canvases/:canvasId/access-requests/me', () =>
          HttpResponse.json({ item: null })
        ),
        http.get('*/api/canvases/:canvasId/access-requests', () =>
          HttpResponse.json({ items: [] })
        ),
        http.get('*/api/canvases/:canvasId/elements', () =>
          HttpResponse.json({ items: [] })
        ),
        http.get('*/api/canvases/:canvasId/scenes', () =>
          HttpResponse.json({ items: [] })
        ),
        http.get('*/api/canvases/:canvasId/workflows', () =>
          HttpResponse.json({ items: [] })
        )
      ]
    },
    a11y: {
      test: 'error'
    },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    options: {
      storySort: {
        order: [
          'UI',
          ['Actions', 'Forms', 'Navigation', 'Overlays', 'Feedback'],
          'Shared',
          'Desktop',
          'Mobile',
          'Integration'
        ]
      }
    }
  }
}

export default preview
