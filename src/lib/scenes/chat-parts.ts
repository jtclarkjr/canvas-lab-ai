// Runtime-safe accessors for chat message parts. Local AI SDK messages are
// typed, but messages arriving over realtime or loaded from the database
// carry `parts: unknown[]` — these helpers narrow both uniformly.

export type ChatPartLike = { type: string } & Record<string, unknown>

export type DisplayMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: unknown[]
}

export function asParts(parts: unknown[]): ChatPartLike[] {
  return parts.filter(
    (part): part is ChatPartLike =>
      typeof part === 'object' &&
      part !== null &&
      typeof (part as { type?: unknown }).type === 'string'
  )
}

export function partText(part: ChatPartLike): string | null {
  if (part.type !== 'text' || typeof part.text !== 'string') {
    return null
  }
  return part.text
}

export type DraftToolPart = {
  state: string
  title: string
  content: string
}

export function writeDocumentPart(part: ChatPartLike): DraftToolPart | null {
  if (part.type !== 'tool-write_document') {
    return null
  }

  const state = typeof part.state === 'string' ? part.state : ''
  const input =
    typeof part.input === 'object' && part.input !== null
      ? (part.input as Record<string, unknown>)
      : null

  return {
    state,
    title: typeof input?.title === 'string' ? input.title : '',
    content: typeof input?.content === 'string' ? input.content : ''
  }
}

export function readContextPart(part: ChatPartLike): { title: string } | null {
  if (part.type !== 'tool-read_context_document') {
    return null
  }

  const output =
    typeof part.output === 'object' && part.output !== null
      ? (part.output as Record<string, unknown>)
      : null

  return {
    title: typeof output?.title === 'string' ? output.title : 'context document'
  }
}

export function isWebSearchPart(part: ChatPartLike): boolean {
  return part.type === 'tool-web_search'
}

export function sourceUrlPart(
  part: ChatPartLike
): { url: string; title: string } | null {
  if (part.type !== 'source-url' || typeof part.url !== 'string') {
    return null
  }

  return {
    url: part.url,
    title: typeof part.title === 'string' && part.title ? part.title : part.url
  }
}

export function messageText(message: DisplayMessage): string {
  return asParts(message.parts)
    .map((part) => partText(part) ?? '')
    .join('')
}
