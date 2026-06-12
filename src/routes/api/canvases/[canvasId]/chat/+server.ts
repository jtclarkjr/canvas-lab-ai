import { json, type RequestHandler } from '@sveltejs/kit'
import {
  chatMessageResponseSchema,
  chatMessageRowSchema,
  chatMessageRowToMessage,
  listChatMessagesResponseSchema,
  sendChatMessageInputSchema
} from '$lib/chat/schema'
import { requireCanvasMember } from '$lib/server/canvas-access'
import {
  AppError,
  handleApiError,
  parseInput,
  parseJsonBody,
  withAuth
} from '$lib/server/api-error'
import { withRateLimit } from '$lib/server/rate-limit'
import { getSupabase } from '$lib/server/supabase'
import type { Json } from '$lib/server/database.types'

// Older history is out of scope: the chatroom loads the latest window only.
const MESSAGE_LIMIT = 200

export const GET: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId } = event.params

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const { data, error } = await supabase
        .from('canvas_chat_messages')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_LIMIT)

      if (error) {
        throw error
      }

      const rows = (data ?? [])
        .map((row) => chatMessageRowSchema.parse(row))
        .reverse()

      // Resolve fresh author display names from profiles so renames show up
      // (the denormalized metadata.author is only the realtime fallback).
      const authorIds = [
        ...new Set(
          rows
            .map((row) => row.created_by)
            .filter((id): id is string => id !== null)
        )
      ]
      const authorNames = new Map<string, string>()
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', authorIds)
        for (const profile of profiles ?? []) {
          authorNames.set(profile.id, profile.display_name || profile.email)
        }
      }

      return json(
        listChatMessagesResponseSchema.parse({
          items: rows.map((row) =>
            chatMessageRowToMessage(
              row,
              row.created_by ? authorNames.get(row.created_by) : null
            )
          )
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })

export const POST: RequestHandler = async (event) =>
  withRateLimit(async () => {
    try {
      const supabase = getSupabase()
      const user = withAuth(event.locals.user)
      const { canvasId } = event.params

      if (!canvasId) {
        return json({ message: 'Canvas id is required.' }, { status: 400 })
      }

      await requireCanvasMember(supabase, canvasId, user.id, 'reader')

      const payload = await parseJsonBody(event.request)
      const input = parseInput(sendChatMessageInputSchema, payload)

      const author = {
        id: user.id,
        name: user.name ?? user.email ?? 'Someone'
      }

      const { data, error } = await supabase
        .from('canvas_chat_messages')
        .insert({
          id: input.id,
          canvas_id: canvasId,
          content: input.content,
          // Denormalized so realtime INSERT payloads (which can't join
          // profiles) carry attribution.
          metadata: { author } as Json,
          created_by: user.id
        })
        .select('*')
        .single()

      if (error) {
        // Unique violation: a retry of a send that already committed. Return
        // the existing row if it's the caller's, otherwise reject the id.
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('canvas_chat_messages')
            .select('*')
            .eq('id', input.id)
            .maybeSingle()

          if (existing && existing.created_by === user.id) {
            return json(
              chatMessageResponseSchema.parse({
                item: chatMessageRowToMessage(
                  chatMessageRowSchema.parse(existing)
                )
              })
            )
          }

          throw new AppError({
            status: 409,
            message: 'A message with this id already exists.',
            code: 'duplicate_message_id'
          })
        }
        throw error
      }

      return json(
        chatMessageResponseSchema.parse({
          item: chatMessageRowToMessage(chatMessageRowSchema.parse(data))
        })
      )
    } catch (error) {
      return handleApiError(error, event.request)
    }
  })({ request: event.request })
