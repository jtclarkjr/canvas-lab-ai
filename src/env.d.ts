// Server-only env vars (read via $env/dynamic/private, never typed here):
// SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
interface ImportMetaEnv {
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly vitest?: typeof import('vitest')
}
