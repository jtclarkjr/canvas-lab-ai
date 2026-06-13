import type { CanvasRole } from '$lib/canvas/roles'
import type { Canvas } from '$lib/canvas/schema'
import type { CanvasElement } from '$lib/workspace/schema'
import type { Point } from '$lib/canvas/types'
import type { Scene } from '$lib/scenes/schema'
import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'

export type CursorCoordinateSpace = 'canvas' | 'viewport'

export type CursorEventPayload = {
  position: Point
  coordinateSpace?: CursorCoordinateSpace
  user: { id: string; name: string }
  color: string
  timestamp: number
}

export type WorkspaceMember = {
  name: string
  color: string
}

export type DisplayMember = {
  id: string
  name: string
  color: string
}

export type CanvasWorkspaceStoreInput = {
  canvasId: string
  userId: string
  userEmail?: string | null
  role?: CanvasRole
  isPublicViewer?: boolean
  canvasTitle?: string
  initialCanvases?: Canvas[]
  initialElements?: CanvasElement[]
  initialScenes?: Scene[]
  sceneDocumentsStore: SceneDocumentsStore
}

export type RealtimeCanvasElementRow = {
  id: string
  type: string
  data: unknown
  x?: number | null
  y?: number | null
  z?: number | null
  created_by?: string | null
}
