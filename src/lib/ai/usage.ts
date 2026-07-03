import { z } from 'zod'

export const promptAiUsageFeatures = [
  'canvas_assistant',
  'document_scene_chat',
  'workflow_ai'
] as const

export type PromptAiUsageFeature = (typeof promptAiUsageFeatures)[number]

export const promptAiUsageFeatureLabels: Record<PromptAiUsageFeature, string> =
  {
    canvas_assistant: 'Canvas Assistant',
    document_scene_chat: 'Document scene AI chat and drafting',
    workflow_ai: 'Workflow AI'
  }

export const promptAiUnlimitedFeatureLabels = [
  'GPT-5.4-nano prompt model',
  'Normal canvas chat',
  'Realtime captions and transcription',
  'Caption translation',
  'Conference calls'
] as const

export const promptAiUsageLimits = [
  {
    id: 'five_hour',
    label: '5-hour limit',
    windowMs: 5 * 60 * 60 * 1000,
    capTokens: 5_000
  },
  {
    id: 'weekly',
    label: 'Weekly limit',
    windowMs: 7 * 24 * 60 * 60 * 1000,
    capTokens: 50_000
  }
] as const

export type PromptAiUsageLimitId = (typeof promptAiUsageLimits)[number]['id']

export const promptAiUsageLimitSchema = z.object({
  id: z.enum(['five_hour', 'weekly']),
  label: z.string(),
  capTokens: z.number().int().nonnegative(),
  usedTokens: z.number().int().nonnegative(),
  resetsAt: z.string()
})

export const promptAiUsageModelSchema = z.object({
  id: z.string(),
  label: z.string()
})

export const promptAiUsageResponseSchema = z.object({
  limits: z.array(promptAiUsageLimitSchema),
  limited: z.object({
    features: z.array(z.string()),
    models: z.array(promptAiUsageModelSchema)
  }),
  unlimited: z.object({
    features: z.array(z.string()),
    models: z.array(promptAiUsageModelSchema)
  }),
  lastUpdatedAt: z.string()
})

export type PromptAiUsageLimit = z.infer<typeof promptAiUsageLimitSchema>
export type PromptAiUsageResponse = z.infer<typeof promptAiUsageResponseSchema>
