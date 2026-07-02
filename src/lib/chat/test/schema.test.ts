import { describe, expect, it } from 'vite-plus/test'
import {
  assistantThreadTitleSchema,
  canvasAssistantRequestSchema
} from '$lib/chat/schema'

describe('chat schema', () => {
  it('defaults canvas assistant web search and keeps UI message parts loose', () => {
    const input = canvasAssistantRequestSchema.parse({
      canvasId: 'canvas-1',
      threadId: '4fb439b4-2fd4-495d-8cfb-d416f28d48a0',
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
    expect(input.threadId).toBe('4fb439b4-2fd4-495d-8cfb-d416f28d48a0')
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

  it('trims and validates assistant thread titles', () => {
    expect(assistantThreadTitleSchema.parse('  Project kickoff  ')).toBe(
      'Project kickoff'
    )
    expect(() => assistantThreadTitleSchema.parse('   ')).toThrow()
    expect(() => assistantThreadTitleSchema.parse('x'.repeat(81))).toThrow()
  })
})
