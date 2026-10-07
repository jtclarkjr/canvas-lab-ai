import {
  SUPABASE_URL,
  VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY,
  ENABLE_GITHUB_AUTH,
  ENABLE_GOOGLE_AUTH,
  ENABLE_APPLE_AUTH
} from '$app/env/private'

import type { AuthConfig } from '#lib/server/types.js'

const flag = (value: string | undefined): boolean =>
  !!value && value.toLowerCase() !== 'false' && value !== '0'

export function getAuthConfig(): AuthConfig {
  const hasUrl = !!SUPABASE_URL || !!VITE_SUPABASE_URL
  const hasPublishableKey = !!VITE_SUPABASE_PUBLISHABLE_KEY
  const configured = hasUrl && hasPublishableKey

  return {
    configured,
    providers: {
      email: configured,
      github: configured && flag(ENABLE_GITHUB_AUTH),
      google: configured && flag(ENABLE_GOOGLE_AUTH),
      apple: configured && flag(ENABLE_APPLE_AUTH)
    }
  }
}
