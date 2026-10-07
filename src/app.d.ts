import type { AuthConfig, RequestUser } from '#lib/server/types.js'
import type { ListCanvasesResponse } from '#lib/canvas/schema.js'

declare global {
  namespace App {
    interface Locals {
      user: RequestUser | null
    }
    interface PageData {
      authConfig: AuthConfig
      user: RequestUser | null
      canvasList: ListCanvasesResponse & { error: string | null }
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
