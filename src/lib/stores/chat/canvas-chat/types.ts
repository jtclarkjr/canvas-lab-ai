import type { ChatMessage } from '$lib/chat/schema'

export type CanvasChatTab = 'chat' | 'assistant'

export type CanvasChatDisplayMode = 'compact' | 'fullscreen'

export type ChatEntryStatus = 'sent' | 'pending' | 'failed'

export type ChatEntry = {
  message: ChatMessage
  status: ChatEntryStatus
  errorMessage?: string
}
