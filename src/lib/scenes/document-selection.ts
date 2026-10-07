import type { SceneDocumentListItem } from '#lib/scenes/schema.js'

export function reconcileActiveDocumentId(
  activeDocumentId: string | null,
  documents: SceneDocumentListItem[]
) {
  if (!activeDocumentId) {
    return null
  }

  return documents.some((document) => document.id === activeDocumentId)
    ? activeDocumentId
    : null
}
