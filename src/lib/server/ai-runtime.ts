import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from '$app/env/private'
import { createAiRegistry, type AiRegistry } from '#lib/server/ai/index.js'

let registry: AiRegistry | null = null

// SvelteKit-specific glue for the portable AI module: the only place that
// reads framework env. Moving the AI layer to a standalone Node API later
// means recreating this file with process.env — nothing else changes.
export function getAiRegistry(): AiRegistry {
  registry ??= createAiRegistry({
    openaiApiKey: OPENAI_API_KEY,
    anthropicApiKey: ANTHROPIC_API_KEY
  })

  return registry
}
