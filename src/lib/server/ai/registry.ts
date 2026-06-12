import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
// Relative import (no $lib alias) keeps this module portable to a
// standalone Node service later.
import { modelOptions } from '../../scenes/models'
import type { AiProviderKeys, AiRegistry, ResolvedModel } from './types'

export class AiModelError extends Error {
  code: 'unknown_model' | 'provider_not_configured'

  constructor(
    message: string,
    code: 'unknown_model' | 'provider_not_configured'
  ) {
    super(message)
    this.name = 'AiModelError'
    this.code = code
  }
}

export function createAiRegistry(keys: AiProviderKeys): AiRegistry {
  const anthropic = keys.anthropicApiKey
    ? createAnthropic({ apiKey: keys.anthropicApiKey })
    : null
  const openai = keys.openaiApiKey
    ? createOpenAI({ apiKey: keys.openaiApiKey })
    : null

  function resolve(modelId: string): ResolvedModel {
    const option = modelOptions.find((entry) => entry.id === modelId)
    if (!option) {
      throw new AiModelError(`Unknown model: ${modelId}`, 'unknown_model')
    }

    const bareId = modelId.slice(option.provider.length + 1)

    if (option.provider === 'anthropic') {
      if (!anthropic) {
        throw new AiModelError(
          'Anthropic models are not configured on this server.',
          'provider_not_configured'
        )
      }
      return {
        model: anthropic(bareId),
        createWebSearchTool: () =>
          anthropic.tools.webSearch_20260209({ maxUses: 5 })
      }
    }

    if (!openai) {
      throw new AiModelError(
        'OpenAI models are not configured on this server.',
        'provider_not_configured'
      )
    }
    return {
      model: openai(bareId),
      createWebSearchTool: () => openai.tools.webSearch()
    }
  }

  return {
    resolve,
    listIds: () => modelOptions.map((entry) => entry.id)
  }
}
