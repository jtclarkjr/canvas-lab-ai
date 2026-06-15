import type { Database } from '$lib/server/database.types'
import type { CanvasRole } from '$lib/canvas/roles'
import type { ListCanvasesResponse } from '$lib/canvas/schema'
import type { SceneDocumentListItem } from '$lib/scenes/schema'

export type RequestUser = {
  id: string
  email: string
  name: string
  image: string | null
  isAnonymous: boolean
}

export type RequestSession = {
  user: RequestUser
  refreshedTokens?: { accessToken: string; refreshToken: string }
}

type CanvasRow = Database['public']['Tables']['canvases']['Row']

export type CanvasAccess = {
  canvas: CanvasRow
  role: CanvasRole | null
  publicAccess: boolean
}

export type ApiErrorIssues = Record<string, string[]>

export type ServerErrorLogEvent = {
  source: 'api'
  expected: boolean
  name: string
  message: string
  status: number
  method: string
  path: string
  code?: string
  issues?: ApiErrorIssues
  details?: Record<string, unknown>
  stack?: string
}

export interface ErrorLogger {
  log: (event: ServerErrorLogEvent) => void
}

export type CanvasListData = ListCanvasesResponse & {
  error: string | null
}

export type SceneDocumentListsBySceneId = Record<
  string,
  SceneDocumentListItem[]
>

export type AuthConfig = {
  configured: boolean
  providers: {
    email: boolean
    github: boolean
    google: boolean
    apple: boolean
  }
}
