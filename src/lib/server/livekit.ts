import { RoomServiceClient } from 'livekit-server-sdk'
import { env as privateEnv } from '$env/dynamic/private'
import { internalServerError } from '$lib/server/api-error'

export function getLiveKitConfig() {
  const url = privateEnv.LIVEKIT_URL
  const apiKey = privateEnv.LIVEKIT_API_KEY
  const apiSecret = privateEnv.LIVEKIT_API_SECRET

  if (!url || !apiKey || !apiSecret) {
    throw internalServerError(
      'LiveKit server environment variables are missing.',
      {
        code: 'missing_livekit_env'
      }
    )
  }

  return { url, apiKey, apiSecret }
}

export function getRoomService() {
  const { url, apiKey, apiSecret } = getLiveKitConfig()
  // The REST client wants the https form of the project's wss URL.
  return new RoomServiceClient(
    url.replace(/^wss?:\/\//, 'https://'),
    apiKey,
    apiSecret
  )
}
