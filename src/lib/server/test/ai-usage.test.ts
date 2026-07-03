import type { LanguageModelUsage } from 'ai'
import { describe, expect, it } from 'vite-plus/test'
import { AppError } from '$lib/server/api-error'
import {
  assertPromptAiUsageAvailable,
  buildPromptAiUsageSummary,
  normalizeLanguageModelUsage
} from '$lib/server/ai-usage'

function usage(partial: Partial<LanguageModelUsage>): LanguageModelUsage {
  return partial as LanguageModelUsage
}

describe('prompt AI usage limits', () => {
  it('normalizes token usage with total token fallback', () => {
    expect(
      normalizeLanguageModelUsage(
        usage({ inputTokens: 120, outputTokens: 30, totalTokens: undefined })
      )
    ).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150
    })

    expect(
      normalizeLanguageModelUsage(
        usage({ inputTokens: undefined, outputTokens: undefined })
      )
    ).toBeNull()
  })

  it('summarizes rolling usage windows and reset times', () => {
    const now = new Date('2026-07-03T12:00:00.000Z')
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    const summary = buildPromptAiUsageSummary(
      [
        { created_at: oneHourAgo.toISOString(), total_tokens: 1_000 },
        { created_at: sixHoursAgo.toISOString(), total_tokens: 600 }
      ],
      now
    )

    expect(summary.limits).toMatchObject([
      {
        id: 'five_hour',
        usedTokens: 1_000,
        resetsAt: new Date(
          oneHourAgo.getTime() + 5 * 60 * 60 * 1000
        ).toISOString()
      },
      {
        id: 'weekly',
        usedTokens: 1_600,
        resetsAt: new Date(
          sixHoursAgo.getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString()
      }
    ])
  })

  it('blocks limited prompt models at the cap but leaves nano available', () => {
    const now = new Date('2026-07-03T12:00:00.000Z')
    const summary = buildPromptAiUsageSummary(
      [{ created_at: now.toISOString(), total_tokens: 5_000 }],
      now
    )

    const error = (() => {
      try {
        assertPromptAiUsageAvailable(summary, 'openai/gpt-5.4-mini')
      } catch (cause) {
        return cause
      }
      return null
    })()

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      status: 429,
      code: 'premium_ai_limit_reached'
    })
    expect(() =>
      assertPromptAiUsageAvailable(summary, 'openai/gpt-5.4-nano')
    ).not.toThrow()
  })
})
