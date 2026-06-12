import { ToolLoopAgent, convertToModelMessages, stepCountIs, type ToolSet } from 'ai'
import { buildDocumentSystemPrompt } from '../prompts/document-presets'
import { createReadContextDocumentTool } from '../tools/read-context-document'
import { writeDocumentTool } from '../tools/write-document'
import type { DocumentChatInput } from '../types'

// The only file touching the AI SDK agent API, as a hedge against version
// drift. Returns the stream result for the HTTP layer to adapt.
export async function streamDocumentChat({
  resolved,
  category,
  webSearch,
  messages,
  activeDocument,
  contextDocuments,
  loadContextDocument
}: DocumentChatInput) {
  const tools: ToolSet = { write_document: writeDocumentTool }

  if (contextDocuments.length > 0) {
    tools.read_context_document = createReadContextDocumentTool({
      contextDocuments,
      loadContextDocument
    })
  }

  if (webSearch && resolved.createWebSearchTool) {
    tools.web_search = resolved.createWebSearchTool()
  }

  const agent = new ToolLoopAgent({
    model: resolved.model,
    instructions: buildDocumentSystemPrompt({
      category,
      activeDocument,
      contextDocuments
    }),
    tools,
    stopWhen: stepCountIs(8)
  })

  return agent.stream({ messages: await convertToModelMessages(messages) })
}
