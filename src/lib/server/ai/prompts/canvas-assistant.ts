import type { ContextDocumentRef } from '../types'

const basePrompt = [
  'You are a helpful assistant inside a collaborative canvas app.',
  'Answer conversationally and keep responses focused and concise.',
  'When the question benefits from current or factual information and a',
  'web_search tool is available, use it and cite your sources.',
  'You cannot edit the canvas or its documents — if asked to, explain',
  'that and answer in chat instead.'
].join(' ')

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
