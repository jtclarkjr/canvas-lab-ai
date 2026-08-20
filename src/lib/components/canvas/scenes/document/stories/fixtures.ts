import type { UIMessage } from 'ai'
import type { SceneDocument, SceneDocumentListItem } from '$lib/scenes/schema'

const base = {
  sceneId: 'scene-story',
  canvasId: 'canvas-story',
  kind: 'markdown',
  createdBy: 'user-james',
  updatedBy: 'user-james',
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:05:00.000Z'
}

export const draftDocument: SceneDocument = {
  ...base,
  id: 'document-draft',
  status: 'draft',
  title: 'Research brief',
  content: {
    docType: 'markdown-doc',
    markdown: '# Research brief\n\nThree customer themes emerged.'
  }
}

export const savedDocument: SceneDocument = {
  ...base,
  id: 'document-saved',
  status: 'saved',
  title: 'Launch checklist',
  content: {
    docType: 'markdown-doc',
    markdown: '# Launch checklist\n\n- Verify analytics\n- Notify customers'
  }
}

export const documentItems: SceneDocumentListItem[] = [
  {
    ...draftDocument,
    content: undefined
  },
  {
    ...savedDocument,
    content: undefined
  }
].map(({ content: _content, ...item }) => item)

export const documentMessages: UIMessage[] = [
  {
    id: 'document-user-message',
    role: 'user',
    parts: [{ type: 'text', text: 'Turn the findings into a brief.' }],
    metadata: { author: { id: 'user-ada', name: 'Ada Lovelace' } }
  },
  {
    id: 'document-assistant-message',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'I organized the findings into three themes.' }
    ],
    metadata: {
      modelId: 'openai/gpt-5.4-mini',
      author: { id: 'user-ada', name: 'Ada Lovelace' }
    }
  }
]
