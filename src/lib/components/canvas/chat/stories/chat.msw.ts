import { HttpResponse, http } from 'msw'

export const storyUserId = 'user-james'
export const storyThreadId = '11111111-1111-4111-8111-111111111111'
export const secondStoryThreadId = '22222222-2222-4222-8222-222222222222'

const createdAt = '2026-08-19T10:00:00.000Z'

export const chatStoryHandlers = [
  http.get('/api/canvases/:canvasId/chat', ({ params }) =>
    HttpResponse.json({
      items: [
        {
          id: 'message-ada',
          canvasId: String(params.canvasId),
          content: 'Draft looks great, @James.',
          author: { id: 'user-ada', name: 'Ada Lovelace' },
          createdBy: 'user-ada',
          createdAt
        },
        {
          id: 'message-james',
          canvasId: String(params.canvasId),
          content: 'Thanks — I will share the next revision.',
          author: { id: storyUserId, name: 'James' },
          createdBy: storyUserId,
          createdAt: '2026-08-19T10:01:00.000Z'
        }
      ]
    })
  ),
  http.post('/api/canvases/:canvasId/chat', async ({ params, request }) => {
    const body = (await request.json()) as { id: string; content: string }
    return HttpResponse.json({
      item: {
        id: body.id,
        canvasId: String(params.canvasId),
        content: body.content,
        author: { id: storyUserId, name: 'James' },
        createdBy: storyUserId,
        createdAt: '2026-08-19T10:02:00.000Z'
      }
    })
  }),
  http.get('/api/canvases/:canvasId/chat/members', () =>
    HttpResponse.json({
      items: [
        { id: storyUserId, name: 'James' },
        { id: 'user-ada', name: 'Ada Lovelace' },
        { id: 'user-grace', name: 'Grace Hopper' }
      ]
    })
  ),
  http.get('/api/canvases/:canvasId/assistant-threads', ({ params }) =>
    HttpResponse.json({
      items: [
        {
          id: storyThreadId,
          canvasId: String(params.canvasId),
          title: 'Research synthesis',
          createdAt,
          updatedAt: '2026-08-19T10:05:00.000Z'
        },
        {
          id: secondStoryThreadId,
          canvasId: String(params.canvasId),
          title: 'Launch checklist',
          createdAt,
          updatedAt: '2026-08-19T10:03:00.000Z'
        }
      ]
    })
  ),
  http.get('/api/canvases/:canvasId/assistant-threads/:threadId/messages', () =>
    HttpResponse.json({
      items: [
        {
          id: 'assistant-user-message',
          role: 'user',
          parts: [{ type: 'text', text: 'Summarize the canvas.' }],
          createdAt
        },
        {
          id: 'assistant-response',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'The canvas groups the research into **three themes**.'
            }
          ],
          createdAt: '2026-08-19T10:00:10.000Z'
        }
      ]
    })
  ),
  http.patch(
    '/api/canvases/:canvasId/assistant-threads/:threadId',
    async ({ params, request }) => {
      const body = (await request.json()) as { title: string }
      return HttpResponse.json({
        item: {
          id: String(params.threadId),
          canvasId: String(params.canvasId),
          title: body.title,
          createdAt,
          updatedAt: '2026-08-19T10:06:00.000Z'
        }
      })
    }
  ),
  http.delete(
    '/api/canvases/:canvasId/assistant-threads/:threadId',
    () => new HttpResponse(null, { status: 204 })
  )
]
