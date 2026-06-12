import { describe, expect, it } from 'vite-plus/test'
import {
  createSceneDocumentInputSchema,
  createSceneInputSchema,
  documentChatRequestSchema,
  listSceneDocumentItemsResponseSchema,
  updateSceneDocumentInputSchema,
  updateSceneInputSchema
} from '$lib/scenes/schema'

describe('scenes schema', () => {
  it('applies scene defaults and validates size bounds', () => {
    const input = createSceneInputSchema.parse({ x: 10, y: 20 })

    expect(input.type).toBe('document')
    expect(input.width).toBeUndefined()

    expect(() =>
      createSceneInputSchema.parse({ x: 0, y: 0, width: 10 })
    ).toThrow()
  })

  it('accepts partial scene updates', () => {
    const input = updateSceneInputSchema.parse({ x: 5 })

    expect(input.x).toBe(5)
    expect(input.title).toBeUndefined()
    expect(updateSceneInputSchema.parse({})).toEqual({})
  })

  it('defaults documents to markdown drafts', () => {
    const input = createSceneDocumentInputSchema.parse({})

    expect(input.kind).toBe('markdown')
    expect(input.status).toBe('draft')
    expect(input.content).toEqual({})
  })

  it('only allows draft or saved statuses', () => {
    expect(
      updateSceneDocumentInputSchema.parse({ status: 'saved' }).status
    ).toBe('saved')

    expect(() =>
      updateSceneDocumentInputSchema.parse({ status: 'archived' })
    ).toThrow()
  })

  it('parses document list items without requiring content', () => {
    const response = listSceneDocumentItemsResponseSchema.parse({
      items: [
        {
          id: 'doc-1',
          sceneId: 'scene-1',
          canvasId: 'canvas-1',
          kind: 'markdown',
          status: 'saved',
          title: 'Spec',
          createdBy: 'user-1',
          updatedBy: 'user-2',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z'
        }
      ]
    })

    expect(response.items[0].title).toBe('Spec')
  })

  it('validates document chat requests', () => {
    const input = documentChatRequestSchema.parse({
      canvasId: 'canvas-1',
      sceneId: 'scene-1',
      documentId: 'doc-1',
      modelId: 'anthropic/claude-opus-4-8',
      category: 'doc-md',
      messages: [{ id: 'm1', role: 'user', parts: [] }]
    })

    expect(input.webSearch).toBe(false)
    expect(input.contextDocumentIds).toEqual([])

    expect(() =>
      documentChatRequestSchema.parse({
        canvasId: 'canvas-1',
        sceneId: 'scene-1',
        documentId: 'doc-1',
        modelId: 'anthropic/claude-opus-4-8',
        category: 'doc-md',
        messages: []
      })
    ).toThrow()
  })
})
