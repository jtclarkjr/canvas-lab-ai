import { json, type RequestHandler } from '@sveltejs/kit'
import {
  endCallSessionForRoom,
  recordCallSessionParticipantForRoom
} from '$lib/server/call-sessions'
import { getLiveKitWebhookReceiver } from '$lib/server/livekit'
import { getSupabase } from '$lib/server/supabase'

function webhookTimestamp(value: bigint) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : undefined
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text()
  const authorization =
    request.headers.get('authorization') ?? request.headers.get('authorize')

  let event: Awaited<
    ReturnType<ReturnType<typeof getLiveKitWebhookReceiver>['receive']>
  >
  try {
    event = await getLiveKitWebhookReceiver().receive(
      body,
      authorization ?? undefined
    )
  } catch {
    return json(
      { error: 'Invalid LiveKit webhook signature.' },
      { status: 401 }
    )
  }

  const room = event.room
  if (
    (event.event === 'room_finished' || event.event === 'participant_joined') &&
    !room?.name
  ) {
    return json({ error: 'LiveKit room data is missing.' }, { status: 400 })
  }

  if (event.event === 'participant_joined' && room) {
    const participant = event.participant
    if (participant?.identity) {
      await recordCallSessionParticipantForRoom({
        supabase: getSupabase(),
        roomName: room.name,
        roomSid: room.sid || null,
        participantIdentity: participant.identity,
        participantName: participant.name || null,
        participantSid: participant.sid || null
      })
    }
    return json({ ok: true })
  }

  if (event.event !== 'room_finished' || !room) {
    return json({ ok: true, ignored: true })
  }

  await endCallSessionForRoom({
    supabase: getSupabase(),
    roomName: room.name,
    roomSid: room.sid || null,
    endedAt: webhookTimestamp(event.createdAt)
  })

  return json({ ok: true })
}
