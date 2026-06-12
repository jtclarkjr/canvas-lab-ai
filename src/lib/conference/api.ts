import { getApiHeaders, parseResponse } from '$lib/api-client'
import type { CaptionLanguageCode } from '$lib/conference/captions'
import {
  captionsTokenResponseSchema,
  conferenceStatusResponseSchema,
  conferenceTokenResponseSchema,
  translateCaptionResponseSchema,
  type CaptionsTokenResponse,
  type ConferenceStatusResponse,
  type ConferenceTokenResponse,
  type TranslateCaptionResponse
} from '$lib/conference/schema'

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

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

export async function fetchCaptionsToken(
  canvasId: string
): Promise<CaptionsTokenResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/conference/captions/token`,
    {
      method: 'POST',
      headers: await getApiHeaders({ accept: 'application/json' })
    }
  )

  return parseResponse(
    response,
    (payload) => captionsTokenResponseSchema.parse(payload),
    'Could not start captions.'
  )
}

export async function translateCaption(
  canvasId: string,
  text: string,
  language: CaptionLanguageCode
): Promise<TranslateCaptionResponse> {
  const response = await fetch(
    `/api/canvases/${canvasId}/conference/captions/translate`,
    {
      method: 'POST',
      headers: await getApiHeaders(jsonHeaders),
      body: JSON.stringify({ text, language })
    }
  )

  return parseResponse(
    response,
    (payload) => translateCaptionResponseSchema.parse(payload),
    'Could not translate the caption.'
  )
}
