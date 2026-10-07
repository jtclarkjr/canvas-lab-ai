import type { ContextDocumentRef } from '../types'
import basePromptMarkdown from '#lib/ai/prompts/markdown/canvas-assistant.md?raw'

const basePrompt = basePromptMarkdown.trim()

type BuildPromptInput = {
  contextDocuments: ContextDocumentRef[]
}

// System prompt for the global canvas Assistant chat. Unlike the document
// agent it has no write tools — it converses, optionally searches the web,
// and can read the canvas's saved documents on demand.
export function buildCanvasAssistantPrompt({
  contextDocuments
}: BuildPromptInput): string {
  const sections = [basePrompt]

  if (contextDocuments.length > 0) {
    const listing = contextDocuments
      .map((doc) => `- ${doc.id}: "${doc.title}"`)
      .join('\n')
    sections.push(
      `The canvas has saved documents you can use as context:\n${listing}\n\nUse the read_context_document tool to read any of them that look relevant to the user's question. Skip the ones that are not — you decide what is useful.`
    )
  }

  return sections.join('\n\n')
}
