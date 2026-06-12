import { tool } from 'ai'
import { z } from 'zod'

// The full draft travels as this tool's input in the UI message stream,
// which cleanly separates document content (tool parts) from chat
// narration (text parts). The chat route persists the latest call's input
// into the scene's active draft.
export const writeDocumentTool = tool({
  description:
    'Write or replace the working document. Always pass the COMPLETE document content as markdown — never a diff, summary, or fragment.',
  inputSchema: z.object({
    title: z.string().describe('Concise document title (also used as the filename stem)'),
    docType: z
      .string()
      .describe('Document type id, e.g. "markdown-doc" or "claude-skill"'),
    content: z.string().describe('The complete markdown content of the document')
  }),
  execute: ({ title }) => ({ saved: true, title })
})
