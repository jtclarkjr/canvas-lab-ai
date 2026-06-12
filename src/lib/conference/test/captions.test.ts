import { describe, expect, it } from 'vite-plus/test'
import {
  CAPTION_LANGUAGES,
  captionDataSchema,
  captionLanguageLabel,
  loadCaptionPrefs
} from '$lib/conference/captions'

describe('caption languages', () => {
  it('puts English first and Japanese second', () => {
    expect(CAPTION_LANGUAGES[0]).toEqual({ code: 'en', label: 'English' })
    expect(CAPTION_LANGUAGES[1]).toEqual({ code: 'ja', label: '日本語' })
  })

  it('labels every code', () => {
    for (const entry of CAPTION_LANGUAGES) {
      expect(captionLanguageLabel(entry.code)).toBe(entry.label)
    }
  })
})

describe('caption data wire format', () => {
  it('accepts a valid segment', () => {
    const parsed = captionDataSchema.parse({
      v: 1,
      id: 'item_123',
      text: 'こんにちは',
      final: true
    })
    expect(parsed.text).toBe('こんにちは')
  })

  it('rejects unknown versions and empty ids', () => {
    expect(
      captionDataSchema.safeParse({ v: 2, id: 'a', text: 'x', final: false })
        .success
    ).toBe(false)
    expect(
      captionDataSchema.safeParse({ v: 1, id: '', text: 'x', final: false })
        .success
    ).toBe(false)
  })
})

describe('caption prefs', () => {
  it('returns empty prefs when storage is unavailable', () => {
    // Node test environment has no localStorage; the loader must not throw.
    expect(loadCaptionPrefs()).toEqual({})
  })
})
