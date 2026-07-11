import {
  AgentDispatchClient,
  RoomServiceClient,
  WebhookReceiver
} from 'livekit-server-sdk'
import { env as privateEnv } from '$env/dynamic/private'
import { internalServerError } from '$lib/server/api-error'

const DEFAULT_TRANSCRIBER_AGENT_NAME = 'canvas-transcriber'
const DEFAULT_TRANSCRIPTION_MODEL = 'deepgram/nova-3'
const DEFAULT_TRANSCRIPTION_LANGUAGE = 'multi'

function liveKitRestUrl(url: string) {
  return url.replace(/^ws/, 'http')
}

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
  return new RoomServiceClient(liveKitRestUrl(url), apiKey, apiSecret)
}

export function getAgentDispatchService() {
  const { url, apiKey, apiSecret } = getLiveKitConfig()
  return new AgentDispatchClient(liveKitRestUrl(url), apiKey, apiSecret)
}

export function getTranscriberAgentName() {
  return DEFAULT_TRANSCRIBER_AGENT_NAME
}

export function getLiveKitWebhookReceiver() {
  const { apiKey, apiSecret } = getLiveKitConfig()
  return new WebhookReceiver(apiKey, apiSecret)
}

export function getLiveKitTranscriptionConfig() {
  return {
    agentName: getTranscriberAgentName(),
    model:
      privateEnv.LIVEKIT_TRANSCRIPTION_MODEL || DEFAULT_TRANSCRIPTION_MODEL,
    language:
      privateEnv.LIVEKIT_TRANSCRIPTION_LANGUAGE ||
      DEFAULT_TRANSCRIPTION_LANGUAGE
  }
}
