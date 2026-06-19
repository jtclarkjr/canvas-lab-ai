import { describe, expect, it } from 'vite-plus/test'
import { canvasAssistantRequestSchema } from '$lib/chat/schema'

describe('chat schema', () => {
  it('defaults canvas assistant web search and keeps UI message parts loose', () => {
    const input = canvasAssistantRequestSchema.parse({
      canvasId: 'canvas-1',
      modelId: 'anthropic/claude-opus-4-8',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Summarize this canvas.' }]
        }
      ]
    })

    expect(input.webSearch).toBe(true)
    expect(input.messages[0].parts).toEqual([
      { type: 'text', text: 'Summarize this canvas.' }
    ])
  })

  it('rejects assistant requests without messages', () => {
    expect(() =>
      canvasAssistantRequestSchema.parse({
        canvasId: 'canvas-1',
        modelId: 'anthropic/claude-opus-4-8',
        messages: []
      })
    ).toThrow()
  })
})
