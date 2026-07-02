import { describe, expect, it } from 'vite-plus/test'
import { deriveAssistantThreadTitleFromText } from '$lib/chat/assistant-title'

describe('assistant title helpers', () => {
  it('normalizes markdown-ish first messages into compact thread titles', () => {
    expect(
      deriveAssistantThreadTitleFromText('  **Explain**   this canvas please  ')
    ).toBe('Explain this canvas please')
  })

  it('falls back for empty text and caps long titles', () => {
    expect(deriveAssistantThreadTitleFromText('   ')).toBe('New chat')
    expect(deriveAssistantThreadTitleFromText('x'.repeat(100))).toHaveLength(80)
  })
})
