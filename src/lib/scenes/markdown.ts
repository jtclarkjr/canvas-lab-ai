import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.use({ gfm: true, breaks: true })

// Markdown → sanitized HTML for client-side rendering. Document content
// comes from the AI and collaborators, so sanitizing is non-negotiable.
export function renderMarkdown(markdown: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const html = marked.parse(markdown, { async: false })
  return DOMPurify.sanitize(html)
}
