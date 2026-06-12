import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'
import type { Database, Json } from '$lib/server/database.types'

type PersistCanvasAssistantChatInput = {
  supabase: SupabaseClient<Database>
  canvasId: string
  userId: string
  modelId: string
  messages: UIMessage[]
  responseMessage: UIMessage
}

// Persists a finished Assistant turn: the new user message + assistant
// response, upserted idempotently by UIMessage id into the caller's
// private per-canvas thread.
export async function persistCanvasAssistantChat({
  supabase,
  canvasId,
  userId,
  modelId,
  messages,
  responseMessage
}: PersistCanvasAssistantChatInput) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')

  // Explicit, distinct timestamps: both rows land in one upsert, so DB
  // defaults would tie and make created_at ordering unstable within a turn.
  const finishedAt = Date.now()

  const rows = [
    ...(lastUserMessage
      ? [
          {
            id: lastUserMessage.id,
            canvas_id: canvasId,
            user_id: userId,
            role: 'user',
            parts: lastUserMessage.parts as unknown as Json,
            created_at: new Date(finishedAt - 1000).toISOString()
          }
        ]
      : []),
    {
      id: responseMessage.id,
      canvas_id: canvasId,
      user_id: userId,
      role: 'assistant',
      parts: responseMessage.parts as unknown as Json,
      metadata: { modelId } as Json,
      created_at: new Date(finishedAt).toISOString()
    }
  ]

  const { error } = await supabase
    .from('canvas_assistant_messages')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    throw error
  }
}
