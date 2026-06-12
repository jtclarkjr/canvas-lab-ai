import { json, type RequestHandler } from '@sveltejs/kit'
import { env as privateEnv } from '$env/dynamic/private'
import {
  CAPTIONS_TRANSCRIBE_MODELS,
  captionsSessionConfig
} from '$lib/conference/captions'
import { captionsTokenResponseSchema } from '$lib/conference/schema'
import {
  handleApiError,
  internalServerError,
  withAuth
} from '$lib/server/api-error'
import { requireCanvasMember } from '$lib/server/canvas-access'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'

// The secret only needs to cover the WebRTC handshake; the session itself
// outlives it.
const CLIENT_SECRET_TTL_SECONDS = 120

type ClientSecretPayload = {
  value?: string
  expires_at?: number
  client_secret?: { value?: string; expires_at?: number }
}

async function mintClientSecret(apiKey: string, model: string) {
  const response = await fetch(
    'https://api.openai.com/v1/realtime/client_secrets',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: {
          anchor: 'created_at',
          seconds: CLIENT_SECRET_TTL_SECONDS
        },
        session: captionsSessionConfig(model)
      })
    }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return { error: { status: response.status, body: body.slice(0, 500) } }
  }

  const payload = (await response.json()) as ClientSecretPayload
  const clientSecret = payload.value ?? payload.client_secret?.value
  const expiresAt =
    payload.expires_at ?? payload.client_secret?.expires_at ?? null

  if (!clientSecret) {
    return { error: { status: response.status, body: 'missing secret value' } }
  }
  return { clientSecret, expiresAt }
}

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId } = event.params

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const apiKey = privateEnv.OPENAI_API_KEY
      if (!apiKey) {
        throw internalServerError(
          'Captions need OPENAI_API_KEY to be set on the server.',
          { code: 'missing_openai_env' }
        )
      }

      // Ephemeral client secret: the browser connects to OpenAI realtime
      // directly with this short-lived value; the real API key never
      // leaves the server. Models are tried in preference order so an
      // account without the streaming model still gets captions.
      let lastError: { status: number; body: string } | null = null
      for (const model of CAPTIONS_TRANSCRIBE_MODELS) {
        const result = await mintClientSecret(apiKey, model)
        if ('clientSecret' in result) {
          return json(
            captionsTokenResponseSchema.parse({
              clientSecret: result.clientSecret,
              expiresAt: result.expiresAt,
              model
            })
          )
        }
        lastError = result.error
        console.warn(
          `[captions-token] OpenAI rejected model "${model}"`,
          result.error.status,
          result.error.body
        )
      }

      throw internalServerError('Could not create a transcription session.', {
        code: 'captions_token_failed',
        details: {
          upstreamStatus: lastError?.status,
          upstreamBody: lastError?.body
        }
      })
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
