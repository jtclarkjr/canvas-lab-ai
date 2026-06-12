import { describe, expect, it } from 'vite-plus/test'
import { reconcileActiveDocumentId } from '$lib/scenes/document-selection'
import type { SceneDocumentListItem } from '$lib/scenes/schema'

const documentItem = (id: string): SceneDocumentListItem => ({
  id,
  sceneId: 'scene-1',
  canvasId: 'canvas-1',
  kind: 'markdown',
  status: 'draft',
  title: id,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
})

describe('document selection reconciliation', () => {
  it('does not auto-select existing documents on open', () => {
    expect(reconcileActiveDocumentId(null, [documentItem('doc-1')])).toBeNull()
  })

  it('keeps an explicit selection across refreshes', () => {
    expect(reconcileActiveDocumentId('doc-1', [documentItem('doc-1')])).toBe(
      'doc-1'
    )
  })

  it('clears a deleted active document without choosing another', () => {
    expect(reconcileActiveDocumentId('doc-1', [documentItem('doc-2')])).toBeNull()
  })
})
