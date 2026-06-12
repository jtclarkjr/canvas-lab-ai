import { getApiHeaders, parseResponse } from '$lib/api-client'
import {
  conferenceStatusResponseSchema,
  conferenceTokenResponseSchema,
  type ConferenceStatusResponse,
  type ConferenceTokenResponse
} from '$lib/conference/schema'

export async function fetchConferenceToken(
  canvasId: string
): Promise<ConferenceTokenResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/conference/token`, {
    method: 'POST',
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => conferenceTokenResponseSchema.parse(payload),
    'Could not join the call.'
  )
}

export async function fetchConferenceStatus(
  canvasId: string
): Promise<ConferenceStatusResponse> {
  const response = await fetch(`/api/canvases/${canvasId}/conference`, {
    headers: await getApiHeaders({ accept: 'application/json' })
  })

  return parseResponse(
    response,
    (payload) => conferenceStatusResponseSchema.parse(payload),
    'Could not check the call status.'
  )
}
