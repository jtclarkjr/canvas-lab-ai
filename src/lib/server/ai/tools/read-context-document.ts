import { tool } from 'ai'
import { z } from 'zod'
import type { ContextDocumentRef, LoadContextDocument } from '../types'

type CreateReadContextDocumentToolInput = {
  contextDocuments: ContextDocumentRef[]
  loadContextDocument: LoadContextDocument
}

// Lets the agent decide which of the user-selected saved documents are
// actually useful: titles are listed in the system prompt, and the agent
// reads only the ones it judges relevant. The loader is injected by the
// route so this module stays storage-agnostic.
export function createReadContextDocumentTool({
  contextDocuments,
  loadContextDocument
}: CreateReadContextDocumentToolInput) {
  return tool({
    description:
      'Read one of the saved context documents the user selected for this task. Only call this for documents that look relevant.',
    inputSchema: z.object({
      documentId: z
        .string()
        .describe('Id of a document from the provided context list')
    }),
    execute: async ({ documentId }) => {
      const allowed = contextDocuments.some((doc) => doc.id === documentId)
      if (!allowed) {
        return { error: 'That document is not in the provided context list.' }
      }

      const document = await loadContextDocument(documentId)
      if (!document) {
        return { error: 'Document not found.' }
      }

      return { title: document.title, content: document.markdown }
    }
  })
}
