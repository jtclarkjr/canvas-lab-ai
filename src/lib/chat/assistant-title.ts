import type { UIMessage } from 'ai'

function textFromMessage(message: UIMessage | undefined) {
  if (!message) {
    return ''
  }

  return message.parts
    .map((part) =>
      part.type === 'text' && 'text' in part && typeof part.text === 'string'
        ? part.text
        : ''
    )
    .join(' ')
}

export function deriveAssistantThreadTitleFromText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return 'New chat'
  }

  const withoutMarkdown = normalized
    .replace(/[`*_#[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const title = withoutMarkdown || normalized

  return title.length > 80 ? `${title.slice(0, 77).trimEnd()}...` : title
}

export function deriveAssistantThreadTitle(message: UIMessage | undefined) {
  return deriveAssistantThreadTitleFromText(textFromMessage(message))
}
