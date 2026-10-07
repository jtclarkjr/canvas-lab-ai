import { describe, expect, it } from 'vite-plus/test'
import {
  CALL_CHAT_MAX_LENGTH,
  CALL_CHAT_TEXT_TOPIC,
  CALL_CHAT_VERSION,
  callChatAttributesSchema,
  callChatContentSchema
} from '#lib/conference/call-chat.js'

describe('call chat wire format', () => {
  it('trims valid message content', () => {
    expect(callChatContentSchema.parse('  hello call  ')).toBe('hello call')
  })

  it('rejects empty and oversized messages', () => {
    expect(callChatContentSchema.safeParse('   ').success).toBe(false)
    expect(
      callChatContentSchema.safeParse('x'.repeat(CALL_CHAT_MAX_LENGTH + 1))
        .success
    ).toBe(false)
  })

  it('accepts valid LiveKit text stream attributes', () => {
    const parsed = callChatAttributesSchema.parse({
      v: CALL_CHAT_VERSION,
      id: '00000000-0000-4000-8000-000000000000',
      createdAt: '2026-06-14T00:00:00.000Z',
      senderName: 'Ada',
      senderColor: '#22c55e'
    })

    expect(parsed.senderName).toBe('Ada')
  })

  it('rejects wrong versions and malformed timestamps', () => {
    expect(
      callChatAttributesSchema.safeParse({
        v: '2',
        id: '00000000-0000-4000-8000-000000000000',
        createdAt: '2026-06-14T00:00:00.000Z',
        senderName: 'Ada'
      }).success
    ).toBe(false)
    expect(
      callChatAttributesSchema.safeParse({
        v: CALL_CHAT_VERSION,
        id: '00000000-0000-4000-8000-000000000000',
        createdAt: 'not-a-date',
        senderName: 'Ada'
      }).success
    ).toBe(false)
  })

  it('uses the dedicated LiveKit text stream topic', () => {
    expect(CALL_CHAT_TEXT_TOPIC).toBe('call-chat')
  })
})
