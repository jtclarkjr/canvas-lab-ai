import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'
import { deriveAssistantThreadTitle } from '$lib/chat/assistant-title'
import type { Database } from '$lib/server/database.types'
import { toDbJson } from '$lib/server/json'

type PersistCanvasAssistantChatInput = {
  supabase: SupabaseClient<Database>
  canvasId: string
  userId: string
  threadId?: string
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
  threadId,
  modelId,
  messages,
  responseMessage
}: PersistCanvasAssistantChatInput) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  const resolvedThreadId = threadId ?? crypto.randomUUID()
  const derivedTitle = deriveAssistantThreadTitle(lastUserMessage)

  // Explicit, distinct timestamps: both rows land in one upsert, so DB
  // defaults would tie and make created_at ordering unstable within a turn.
  const finishedAt = Date.now()
  const finishedAtIso = new Date(finishedAt).toISOString()

  const { data: existingThread, error: existingThreadError } = await supabase
    .from('canvas_assistant_threads')
    .select('id, title')
    .eq('id', resolvedThreadId)
    .eq('canvas_id', canvasId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingThreadError) {
    throw existingThreadError
  }

  if (existingThread) {
    const { error } = await supabase
      .from('canvas_assistant_threads')
      .update({
        ...(existingThread.title === 'New chat' ? { title: derivedTitle } : {}),
        updated_at: finishedAtIso
      })
      .eq('id', resolvedThreadId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  } else {
    const { error } = await supabase.from('canvas_assistant_threads').insert({
      id: resolvedThreadId,
      canvas_id: canvasId,
      user_id: userId,
      title: derivedTitle,
      created_at: new Date(finishedAt - 1000).toISOString(),
      updated_at: finishedAtIso
    })

    if (error) {
      throw error
    }
  }

  const rows = [
    ...(lastUserMessage
      ? [
          {
            id: lastUserMessage.id,
            thread_id: resolvedThreadId,
            canvas_id: canvasId,
            user_id: userId,
            role: 'user',
            parts: toDbJson(lastUserMessage.parts),
            created_at: new Date(finishedAt - 1000).toISOString()
          }
        ]
      : []),
    {
      id: responseMessage.id,
      thread_id: resolvedThreadId,
      canvas_id: canvasId,
      user_id: userId,
      role: 'assistant',
      parts: toDbJson(responseMessage.parts),
      metadata: toDbJson({ modelId }),
      created_at: finishedAtIso
    }
  ]

  const { error } = await supabase
    .from('canvas_assistant_messages')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    throw error
  }
}
