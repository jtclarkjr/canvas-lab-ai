import type {
  ConferenceCallChatEntry,
  ConferenceParticipant
} from '$lib/conference/types'

const mockVideoTrack = {
  attach: () => undefined,
  detach: () => undefined
} as never

export const conferenceParticipants: ConferenceParticipant[] = [
  {
    identity: 'user-story',
    sid: 'participant-local',
    name: 'Alex Morgan',
    isLocal: true,
    isSpeaking: false,
    micEnabled: true,
    camEnabled: false,
    wantsCaptions: true,
    color: '#bfdbfe',
    videoTrack: null,
    screenShareTrack: null,
    audioTrack: null
  },
  {
    identity: 'user-riley',
    sid: 'participant-riley',
    name: 'Riley Chen',
    isLocal: false,
    isSpeaking: true,
    micEnabled: true,
    camEnabled: false,
    wantsCaptions: true,
    color: '#ddd6fe',
    videoTrack: null,
    screenShareTrack: mockVideoTrack,
    audioTrack: null
  },
  {
    identity: 'user-sam',
    sid: 'participant-sam',
    name: 'Sam Rivera',
    isLocal: false,
    isSpeaking: false,
    micEnabled: false,
    camEnabled: false,
    wantsCaptions: false,
    color: '#a7f3d0',
    videoTrack: null,
    screenShareTrack: null,
    audioTrack: null
  }
]

export const conferenceChatEntries: ConferenceCallChatEntry[] = [
  {
    message: {
      id: 'call-message-1',
      content: 'The revised flow is ready for review.',
      author: { id: 'user-riley', name: 'Riley Chen', color: '#ddd6fe' },
      createdBy: 'user-riley',
      createdAt: '2026-08-19T12:00:00.000Z'
    },
    status: 'sent'
  },
  {
    message: {
      id: 'call-message-2',
      content: 'I will check the empty states next.',
      author: { id: 'user-story', name: 'Alex Morgan', color: '#bfdbfe' },
      createdBy: 'user-story',
      createdAt: '2026-08-19T12:01:00.000Z'
    },
    status: 'sent'
  }
]
