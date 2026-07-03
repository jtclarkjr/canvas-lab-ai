import {
  ToolLoopAgent,
  convertToModelMessages,
  stepCountIs,
  type ToolSet
} from 'ai'
import { buildCanvasAssistantPrompt } from '../prompts/canvas-assistant'
import { createReadContextDocumentTool } from '../tools/read-context-document'
import type { CanvasAssistantInput } from '../types'

// Global canvas Assistant: conversation + optional web search + read-only
// access to the canvas's saved documents. Returns the stream result for
// the HTTP layer to adapt.
export async function streamCanvasAssistant({
  resolved,
  webSearch,
  messages,
  contextDocuments,
  loadContextDocument,
  onFinish
}: CanvasAssistantInput) {
  const tools: ToolSet = {}

  if (contextDocuments.length > 0) {
    tools.read_context_document = createReadContextDocumentTool({
      contextDocuments,
      loadContextDocument,
      description:
        "Read one of the canvas's saved documents. Only call this for documents that look relevant to the user's question."
    })
  }

  if (webSearch && resolved.createWebSearchTool) {
    tools.web_search = resolved.createWebSearchTool()
  }

  const agent = new ToolLoopAgent({
    model: resolved.model,
    instructions: buildCanvasAssistantPrompt({ contextDocuments }),
    tools,
    stopWhen: stepCountIs(8),
    onFinish
  })

  return agent.stream({ messages: await convertToModelMessages(messages) })
}
