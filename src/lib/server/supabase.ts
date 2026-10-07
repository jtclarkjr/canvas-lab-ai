import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SECRET_KEY } from '$app/env/private'
import { internalServerError } from '#lib/server/api-error.js'
import type { Database } from '#lib/server/database.types.js'

export function getSupabase() {
  const supabaseUrl = SUPABASE_URL
  const supabaseSecretKey = SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey) {
    throw internalServerError(
      'Supabase server environment variables are missing.',
      {
        code: 'missing_supabase_env'
      }
    )
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey)
}
