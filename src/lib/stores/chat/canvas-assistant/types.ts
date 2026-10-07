import type { AssistantThread } from '#lib/chat/schema.js'

export type AssistantThreadEntry = AssistantThread & {
  local?: boolean
}
