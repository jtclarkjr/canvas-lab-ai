import type { ModelOption } from '$lib/scenes/types'

// Model catalog: the single data source for model ids. The client picker
// renders these options; the server AI registry maps the ids to provider
// instances. Updating a model id is a one-line change here.
export const modelOptions: ModelOption[] = [
  {
    id: 'anthropic/claude-opus-4-8',
    label: 'Claude Opus 4.8',
    provider: 'anthropic',
    usageTier: 'limited'
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    usageTier: 'limited'
  },
  {
    id: 'anthropic/claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    usageTier: 'limited'
  },
  {
    id: 'openai/gpt-5.5',
    label: 'GPT-5.5',
    provider: 'openai',
    usageTier: 'limited'
  },
  {
    id: 'openai/gpt-5.4',
    label: 'GPT-5.4',
    provider: 'openai',
    usageTier: 'limited'
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT-5.4-mini',
    provider: 'openai',
    usageTier: 'limited'
  },
  {
    id: 'openai/gpt-5.4-nano',
    label: 'GPT-5.4-nano',
    provider: 'openai',
    usageTier: 'unlimited'
  }
]

export const defaultModelId = 'openai/gpt-5.4-mini'

export function getModelOption(id: string): ModelOption | null {
  return modelOptions.find((option) => option.id === id) ?? null
}

export function isKnownModelId(id: string): boolean {
  return modelOptions.some((option) => option.id === id)
}

export function isPromptModelLimited(id: string): boolean {
  return getModelOption(id)?.usageTier === 'limited'
}

export function isPromptModelUnlimited(id: string): boolean {
  return getModelOption(id)?.usageTier === 'unlimited'
}
