import { env as privateEnv } from '$env/dynamic/private'
import { createAiRegistry, type AiRegistry } from '$lib/server/ai'

let registry: AiRegistry | null = null

// SvelteKit-specific glue for the portable AI module: the only place that
// reads framework env. Moving the AI layer to a standalone Node API later
// means recreating this file with process.env — nothing else changes.
export function getAiRegistry(): AiRegistry {
  registry ??= createAiRegistry({
    openaiApiKey: privateEnv.OPENAI_API_KEY,
    anthropicApiKey: privateEnv.ANTHROPIC_API_KEY
  })

  return registry
}
