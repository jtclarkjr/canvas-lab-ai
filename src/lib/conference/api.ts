import { apiRequest } from '$lib/api-client'
import type { CaptionLanguageCode } from '$lib/conference/captions'
import {
  captionsTokenResponseSchema,
  conferenceStatusResponseSchema,
  conferenceTokenResponseSchema,
  getCallSessionResponseSchema,
  listCallSessionsResponseSchema,
  startCallTranscriptionResponseSchema,
  translateCaptionResponseSchema,
  type CaptionsTokenResponse,
  type GetCallSessionResponse,
  type ListCallSessionsResponse,
  type ConferenceStatusResponse,
  type ConferenceTokenResponse,
  type StartCallTranscriptionResponse,
  type TranslateCaptionResponse
} from '$lib/conference/schema'

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json'
}

export async function fetchConferenceToken(
  canvasId: string
): Promise<ConferenceTokenResponse> {
  return apiRequest(`/api/canvases/${canvasId}/conference/token`, {
    method: 'POST',
    parse: (payload) => conferenceTokenResponseSchema.parse(payload),
    fallbackMessage: 'Could not join the call.'
  })
}

export async function fetchConferenceStatus(
  canvasId: string
): Promise<ConferenceStatusResponse> {
  return apiRequest(`/api/canvases/${canvasId}/conference`, {
    parse: (payload) => conferenceStatusResponseSchema.parse(payload),
    fallbackMessage: 'Could not check the call status.'
  })
}

export async function fetchCaptionsToken(
  canvasId: string
): Promise<CaptionsTokenResponse> {
  return apiRequest(`/api/canvases/${canvasId}/conference/captions/token`, {
    method: 'POST',
    parse: (payload) => captionsTokenResponseSchema.parse(payload),
    fallbackMessage: 'Could not start captions.'
  })
}

export async function listCallSessions(
  canvasId: string
): Promise<ListCallSessionsResponse> {
  return apiRequest(`/api/canvases/${canvasId}/call-sessions`, {
    parse: (payload) => listCallSessionsResponseSchema.parse(payload),
    fallbackMessage: 'Could not load call sessions.'
  })
}

export async function getCallSession(
  canvasId: string,
  sessionId: string
): Promise<GetCallSessionResponse> {
  return apiRequest(`/api/canvases/${canvasId}/call-sessions/${sessionId}`, {
    parse: (payload) => getCallSessionResponseSchema.parse(payload),
    fallbackMessage: 'Could not load the transcript.'
  })
}

export async function reconcileCallSession(
  canvasId: string,
  sessionId: string
): Promise<GetCallSessionResponse> {
  return apiRequest(
    `/api/canvases/${canvasId}/call-sessions/${sessionId}/reconcile`,
    {
      method: 'POST',
      parse: (payload) => getCallSessionResponseSchema.parse(payload),
      fallbackMessage: 'Could not reconcile the transcript.'
    }
  )
}

export async function startCallTranscription(
  canvasId: string
): Promise<StartCallTranscriptionResponse> {
  return apiRequest(
    `/api/canvases/${canvasId}/conference/transcription/start`,
    {
      method: 'POST',
      parse: (payload) => startCallTranscriptionResponseSchema.parse(payload),
      fallbackMessage: 'Could not start transcription.'
    }
  )
}

export async function translateCaption(
  canvasId: string,
  text: string,
  language: CaptionLanguageCode
): Promise<TranslateCaptionResponse> {
  return apiRequest(`/api/canvases/${canvasId}/conference/captions/translate`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ text, language }),
    parse: (payload) => translateCaptionResponseSchema.parse(payload),
    fallbackMessage: 'Could not translate the caption.'
  })
}
