import type { AssistantThread } from '$lib/chat/schema'

export type AssistantThreadEntry = AssistantThread & {
  local?: boolean
}
