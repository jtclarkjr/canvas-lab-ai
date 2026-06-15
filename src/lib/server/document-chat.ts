import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'
import type { Database, Json } from '$lib/server/database.types'

type SceneRow = Database['public']['Tables']['canvas_scenes']['Row']

type WriteDocumentInput = {
  title: string
  docType: string
  content: string
}

// Extracts the last completed write_document call from an assistant
// message. Tool parts are typed `tool-${name}` in the UI message stream.
export function latestWriteDocumentInput(
  message: UIMessage
): WriteDocumentInput | null {
  let latest: WriteDocumentInput | null = null

  for (const part of message.parts) {
    if (
      part.type === 'tool-write_document' &&
      'state' in part &&
      part.state === 'output-available' &&
      part.input &&
      typeof part.input === 'object'
    ) {
      const input = part.input as Partial<WriteDocumentInput>
      if (typeof input.content === 'string') {
        latest = {
          title: typeof input.title === 'string' ? input.title : '',
          docType: typeof input.docType === 'string' ? input.docType : '',
          content: input.content
        }
      }
    }
  }

  return latest
}

type MessageAuthor = {
  id: string
  name: string
}

type PersistDocumentChatInput = {
  supabase: SupabaseClient<Database>
  scene: SceneRow
  documentId: string
  userId: string
  author: MessageAuthor
  modelId: string
  messages: UIMessage[]
  responseMessage: UIMessage
}

// Persists the turn's outcome after the stream completes: the new user
// message + assistant response (idempotent upserts keyed by UIMessage id),
// the active draft when write_document ran, and a card preview snippet.
export async function persistDocumentChat({
  supabase,
  scene,
  documentId,
  userId,
  author,
  modelId,
  messages,
  responseMessage
}: PersistDocumentChatInput) {
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
            scene_id: scene.id,
            canvas_id: scene.canvas_id,
            document_id: documentId,
            role: 'user',
            parts: JSON.parse(JSON.stringify(lastUserMessage.parts)) as Json,
            // Author display info is denormalized so realtime INSERT
            // payloads (which can't join profiles) carry attribution.
            metadata: { author } as Json,
            created_by: userId,
            created_at: new Date(finishedAt - 1000).toISOString()
          }
        ]
      : []),
    {
      id: responseMessage.id,
      scene_id: scene.id,
      canvas_id: scene.canvas_id,
      document_id: documentId,
      role: 'assistant',
      parts: JSON.parse(JSON.stringify(responseMessage.parts)) as Json,
      // author on an assistant message = the user who requested the turn.
      metadata: { modelId, author } as Json,
      created_by: userId,
      created_at: new Date(finishedAt).toISOString()
    }
  ]

  const { error: messagesError } = await supabase
    .from('canvas_scene_messages')
    .upsert(rows, { onConflict: 'id' })

  if (messagesError) {
    throw messagesError
  }

  const draft = latestWriteDocumentInput(responseMessage)
  if (!draft) {
    return
  }

  // Rewrites replace the markdown but must keep the user's annotations
  // (the notes view's drawing layer) that live on the same content blob.
  const { data: currentDocument } = await supabase
    .from('canvas_scene_documents')
    .select('content')
    .eq('id', documentId)
    .maybeSingle()
  const currentContent = (currentDocument?.content ?? {}) as Record<
    string,
    unknown
  >

  const { error: documentError } = await supabase
    .from('canvas_scene_documents')
    .update({
      title: draft.title,
      kind: 'markdown',
      content: {
        ...(currentContent.annotations !== undefined
          ? { annotations: currentContent.annotations }
          : null),
        docType: draft.docType,
        markdown: draft.content
      } as Json,
      updated_by: userId
    })
    .eq('id', documentId)

  if (documentError) {
    throw documentError
  }

  // Keep the card useful at a glance: preview snippet + a title for
  // untitled scenes.
  const preview = draft.content.replace(/\s+/g, ' ').trim().slice(0, 140)
  const settings = {
    ...(scene.settings as Record<string, unknown>),
    preview
  } as Json

  const { error: sceneError } = await supabase
    .from('canvas_scenes')
    .update({
      settings,
      ...(scene.title === '' || scene.title === 'New document'
        ? { title: draft.title }
        : null),
      updated_by: userId
    })
    .eq('id', scene.id)

  if (sceneError) {
    throw sceneError
  }
}
