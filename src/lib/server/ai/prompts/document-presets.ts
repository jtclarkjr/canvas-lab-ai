import type { ActiveDocument, ContextDocumentRef } from '../types'
import basePromptMarkdown from '#lib/ai/prompts/markdown/document/base.md?raw'
import claudeSkillPromptMarkdown from '#lib/ai/prompts/markdown/document/categories/claude-skill.md?raw'
import docMdPromptMarkdown from '#lib/ai/prompts/markdown/document/categories/doc-md.md?raw'

const basePrompt = basePromptMarkdown.trim()

const categoryPrompts: Record<string, string> = {
  'doc-md': docMdPromptMarkdown.trim(),
  'claude-skill': claudeSkillPromptMarkdown.trim()
}

type BuildPromptInput = {
  category: string
  activeDocument: ActiveDocument | null
  contextDocuments: ContextDocumentRef[]
}

export function buildDocumentSystemPrompt({
  category,
  activeDocument,
  contextDocuments
}: BuildPromptInput): string {
  const sections = [basePrompt, categoryPrompts[category] ?? '']

  if (activeDocument) {
    sections.push(
      `The user is iterating on an existing document titled "${activeDocument.title}". Current content:\n\n<current_document>\n${activeDocument.markdown}\n</current_document>\n\nIMPORTANT: this <current_document> is the authoritative latest version. The user may have edited it manually since your last write_document call, so it can differ from the version in your conversation history — ALWAYS base revisions on the content above, never on your earlier tool calls, and preserve the user's manual edits unless they ask you to change those parts. When revising, call write_document with the complete updated document.`
    )
  }

  if (contextDocuments.length > 0) {
    const listing = contextDocuments
      .map((doc) => {
        const source =
          doc.source === 'linked-scene'
            ? ` from connected scene "${doc.sceneTitle ?? 'Untitled scene'}"`
            : ''
        return `- ${doc.id}: "${doc.title}"${source}`
      })
      .join('\n')
    sections.push(
      `Saved documents are available as optional context:\n${listing}\n\nSome were selected by the user; some come from connected scenes whose arrows point into this scene, or from bidirectional lines. Use the read_context_document tool to read any that look relevant to the task. Skip the ones that are not — you decide what is useful.`
    )
  }

  return sections.filter(Boolean).join('\n\n')
}
