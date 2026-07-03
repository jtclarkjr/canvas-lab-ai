import type { SupabaseClient } from '@supabase/supabase-js'
import type { LanguageModelUsage } from 'ai'
import {
  promptAiUsageFeatureLabels,
  promptAiUsageLimits,
  promptAiUnlimitedFeatureLabels,
  type PromptAiUsageFeature,
  type PromptAiUsageResponse
} from '$lib/ai/usage'
import {
  isPromptModelLimited,
  isPromptModelUnlimited,
  modelOptions
} from '$lib/scenes/models'
import { AppError, internalServerError } from '$lib/server/api-error'
import type { Database } from '$lib/server/database.types'
import { logServerError } from '$lib/server/logger'

type Supabase = SupabaseClient<Database>

type UsageEventRow = {
  created_at: string
  total_tokens: number
}

type NormalizedUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

function timestamp(value: string): number {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function resetAt(rows: UsageEventRow[], windowMs: number, now: Date): string {
  if (rows.length === 0) {
    return new Date(now.getTime() + windowMs).toISOString()
  }

  const oldest = Math.min(...rows.map((row) => timestamp(row.created_at)))
  return new Date(oldest + windowMs).toISOString()
}

export function normalizeLanguageModelUsage(
  usage: LanguageModelUsage
): NormalizedUsage | null {
  const inputTokens = Math.max(0, usage.inputTokens ?? 0)
  const outputTokens = Math.max(0, usage.outputTokens ?? 0)
  const totalTokens = Math.max(
    0,
    usage.totalTokens ?? inputTokens + outputTokens
  )

  if (totalTokens === 0) {
    return null
  }

  return { inputTokens, outputTokens, totalTokens }
}

export function buildPromptAiUsageSummary(
  rows: UsageEventRow[],
  now = new Date()
): PromptAiUsageResponse {
  const nowMs = now.getTime()
  const limits = promptAiUsageLimits.map((limit) => {
    const windowStart = nowMs - limit.windowMs
    const windowRows = rows.filter(
      (row) => timestamp(row.created_at) >= windowStart
    )
    const usedTokens = windowRows.reduce(
      (sum, row) => sum + Math.max(0, row.total_tokens),
      0
    )

    return {
      id: limit.id,
      label: limit.label,
      capTokens: limit.capTokens,
      usedTokens,
      resetsAt: resetAt(windowRows, limit.windowMs, now)
    }
  })

  return {
    limits,
    limited: {
      features: Object.values(promptAiUsageFeatureLabels),
      models: modelOptions
        .filter((option) => option.usageTier === 'limited')
        .map((option) => ({ id: option.id, label: option.label }))
    },
    unlimited: {
      features: [...promptAiUnlimitedFeatureLabels],
      models: modelOptions
        .filter((option) => option.usageTier === 'unlimited')
        .map((option) => ({ id: option.id, label: option.label }))
    },
    lastUpdatedAt: now.toISOString()
  }
}

export function exceededPromptAiUsageLimits(summary: PromptAiUsageResponse) {
  return summary.limits.filter((limit) => limit.usedTokens >= limit.capTokens)
}

export function assertPromptAiUsageAvailable(
  summary: PromptAiUsageResponse,
  modelId: string
) {
  if (!isPromptModelLimited(modelId)) {
    return
  }

  const exceeded = exceededPromptAiUsageLimits(summary)
  if (exceeded.length === 0) {
    return
  }

  throw new AppError({
    status: 429,
    message:
      'Premium model limit reached. Switch to GPT-5.4-nano or try again after your limit resets.',
    code: 'premium_ai_limit_reached',
    details: {
      limits: exceeded.map((limit) => ({
        id: limit.id,
        resetsAt: limit.resetsAt
      }))
    }
  })
}

export async function getPromptAiUsageSummary(params: {
  supabase: Supabase
  userId: string
  now?: Date
}): Promise<PromptAiUsageResponse> {
  const now = params.now ?? new Date()
  const longestWindowMs = Math.max(
    ...promptAiUsageLimits.map((limit) => limit.windowMs)
  )
  const since = new Date(now.getTime() - longestWindowMs).toISOString()

  const { data, error } = await params.supabase
    .from('prompt_ai_usage_events')
    .select('created_at, total_tokens')
    .eq('user_id', params.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return buildPromptAiUsageSummary(data ?? [], now)
}

export async function assertPromptAiUsageAllowed(params: {
  supabase: Supabase
  userId: string
  modelId: string
}) {
  if (isPromptModelUnlimited(params.modelId)) {
    return
  }

  const summary = await getPromptAiUsageSummary({
    supabase: params.supabase,
    userId: params.userId
  })
  assertPromptAiUsageAvailable(summary, params.modelId)
}

export async function recordPromptAiUsage(params: {
  supabase: Supabase
  request: Request
  userId: string
  feature: PromptAiUsageFeature
  modelId: string
  usage: LanguageModelUsage
}) {
  if (!isPromptModelLimited(params.modelId)) {
    return
  }

  const usage = normalizeLanguageModelUsage(params.usage)
  if (!usage) {
    return
  }

  const { error } = await params.supabase
    .from('prompt_ai_usage_events')
    .insert({
      user_id: params.userId,
      feature: params.feature,
      model_id: params.modelId,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens
    })

  if (error) {
    logServerError({
      error: internalServerError('Failed to record AI usage.', {
        code: 'prompt_ai_usage_record_failed',
        cause: error,
        details: {
          feature: params.feature,
          modelId: params.modelId
        }
      }),
      request: params.request,
      unexpected: true
    })
  }
}
