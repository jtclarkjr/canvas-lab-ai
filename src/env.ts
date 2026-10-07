import { defineEnvVars } from '@sveltejs/kit/env'

// Missing values remain empty strings: consumers guard credentials and use
// truthiness checks or explicit defaults for optional flags and LiveKit options.
export const variables = defineEnvVars({
  OPENAI_API_KEY: { schema: (input) => input ?? '' },
  ANTHROPIC_API_KEY: { schema: (input) => input ?? '' },
  SUPABASE_URL: { schema: (input) => input ?? '' },
  VITE_SUPABASE_PUBLISHABLE_KEY: { schema: (input) => input ?? '' },
  VITE_SUPABASE_URL: { schema: (input) => input ?? '' },
  ENABLE_GITHUB_AUTH: { schema: (input) => input ?? '' },
  ENABLE_GOOGLE_AUTH: { schema: (input) => input ?? '' },
  ENABLE_APPLE_AUTH: { schema: (input) => input ?? '' },
  WORKFLOW_ENABLED: { schema: (input) => input ?? '' },
  LIVEKIT_URL: { schema: (input) => input ?? '' },
  LIVEKIT_API_KEY: { schema: (input) => input ?? '' },
  LIVEKIT_API_SECRET: { schema: (input) => input ?? '' },
  LIVEKIT_TRANSCRIPTION_MODEL: { schema: (input) => input ?? '' },
  LIVEKIT_TRANSCRIPTION_LANGUAGE: { schema: (input) => input ?? '' },
  SUPABASE_SECRET_KEY: { schema: (input) => input ?? '' }
})
