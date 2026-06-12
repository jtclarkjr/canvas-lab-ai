import type {
  SceneDocumentRow,
  SceneMessageRow,
  SceneRow
} from '$lib/scenes/schema'

// Row → client shape mappers, shared by the server routes and the client
// realtime stores (which receive raw rows from postgres_changes payloads).

export const sceneRowToScene = (row: SceneRow) => ({
  id: row.id,
  canvasId: row.canvas_id,
  type: row.type,
  title: row.title,
  x: row.x,
  y: row.y,
  width: row.width,
  height: row.height,
  settings: row.settings,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const sceneDocumentRowToDocument = (row: SceneDocumentRow) => ({
  id: row.id,
  sceneId: row.scene_id,
  canvasId: row.canvas_id,
  kind: row.kind,
  status: row.status,
  title: row.title,
  content: row.content,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

// Author attribution is stamped into metadata at persist time so realtime
// payloads (which cannot join profiles) still carry a display name.
function authorFromMetadata(metadata: SceneMessageRow['metadata']) {
  const author = metadata?.author
  if (
    typeof author === 'object' &&
    author !== null &&
    typeof (author as { id?: unknown }).id === 'string' &&
    typeof (author as { name?: unknown }).name === 'string'
  ) {
    return author as { id: string; name: string }
  }
  return null
}

export const sceneMessageRowToMessage = (row: SceneMessageRow) => ({
  id: row.id,
  sceneId: row.scene_id,
  documentId: row.document_id ?? null,
  role: row.role,
  parts: row.parts,
  metadata: row.metadata,
  author: authorFromMetadata(row.metadata),
  createdBy: row.created_by,
  createdAt: row.created_at
})
