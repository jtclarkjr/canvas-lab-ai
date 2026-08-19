<script lang="ts">
  import CanvasConference from '../CanvasConference.svelte'
  import ConferenceCallChatPanel from '../ConferenceCallChatPanel.svelte'
  import ConferenceSettingsDialog from '../ConferenceSettingsDialog.svelte'
  import ConferenceCCButton from '../controls/ConferenceCCButton.svelte'
  import ConferenceCallButton from '../controls/ConferenceCallButton.svelte'
  import ConferenceCamButton from '../controls/ConferenceCamButton.svelte'
  import ConferenceControls from '../controls/ConferenceControls.svelte'
  import ConferenceMeetingToolsButton from '../controls/ConferenceMeetingToolsButton.svelte'
  import ConferenceMicButton from '../controls/ConferenceMicButton.svelte'
  import ConferenceFullscreen from '../layout/ConferenceFullscreen.svelte'
  import ConferenceFullscreenPanel from '../layout/ConferenceFullscreenPanel.svelte'
  import ConferencePip from '../layout/ConferencePip.svelte'
  import ConferenceParticipantStrip from '../tiles/ConferenceParticipantStrip.svelte'
  import ConferenceParticipantTile from '../tiles/ConferenceParticipantTile.svelte'
  import ConferenceScreenTile from '../tiles/ConferenceScreenTile.svelte'
  import ConferenceTileGrid from '../tiles/ConferenceTileGrid.svelte'
  import MobileCanvasConference from '$lib/mobile/components/conference/MobileCanvasConference.svelte'
  import MobileConferenceControls from '$lib/mobile/components/conference/MobileConferenceControls.svelte'
  import MobileConferenceFullscreen from '$lib/mobile/components/conference/MobileConferenceFullscreen.svelte'
  import MobileConferenceMinimizedChip from '$lib/mobile/components/conference/MobileConferenceMinimizedChip.svelte'
  import MobileConferenceSheet from '$lib/mobile/components/conference/MobileConferenceSheet.svelte'
  import MobileConferenceTileGrid from '$lib/mobile/components/conference/MobileConferenceTileGrid.svelte'
  import { provideCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import {
    createCanvasConferenceStore,
    provideCanvasConferenceStoreInstance
  } from '$lib/stores/conference/index.svelte'
  import type {
    ConferenceFullscreenChatTab,
    ConferenceFullscreenPanel as FullscreenPanel,
    ConferenceLayoutMode,
    ConferenceStatus,
    ConferenceViewMode,
    BgPreset
  } from '$lib/conference/types'
  import { conferenceChatEntries, conferenceParticipants } from './fixtures'

  type Target =
    | 'canvas-conference'
    | 'call-chat'
    | 'settings'
    | 'cc-button'
    | 'call-button'
    | 'cam-button'
    | 'controls'
    | 'meeting-tools'
    | 'mic-button'
    | 'fullscreen'
    | 'fullscreen-panel'
    | 'pip'
    | 'participant-strip'
    | 'participant-tile'
    | 'screen-tile'
    | 'tile-grid'
    | 'mobile-canvas-conference'
    | 'mobile-controls'
    | 'mobile-fullscreen'
    | 'mobile-minimized-chip'
    | 'mobile-sheet'
    | 'mobile-tile-grid'

  let { target } = $props<{ target: Target }>()

  function initialViewMode(): ConferenceViewMode {
    if (target === 'mobile-minimized-chip') return 'bar'
    if (
      target === 'fullscreen' ||
      target === 'mobile-fullscreen' ||
      target === 'mobile-sheet'
    ) {
      return 'fullscreen'
    }
    return 'pip'
  }

  function storyBackgroundThumbnail(preset: BgPreset) {
    if (preset.type !== 'virtual') return null
    const colors: Record<string, string> = {
      office: '#cbd5e1',
      desk: '#bfdbfe',
      library: '#d6d3d1',
      cafe: '#fed7aa',
      forest: '#bbf7d0',
      mountains: '#ddd6fe'
    }
    const color = colors[preset.id] ?? '#e2e8f0'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="108"><rect width="192" height="108" fill="${color}"/><path d="M0 82L48 46l32 24 36-42 76 54v26H0z" fill="#334155" fill-opacity=".28"/></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }

  let result = $state('')
  // svelte-ignore state_referenced_locally -- each story mounts a fixed target.
  let status = $state<ConferenceStatus>(
    target === 'call-button' ? 'idle' : 'connected'
  )
  // svelte-ignore state_referenced_locally -- each story mounts a fixed target.
  let viewMode = $state<ConferenceViewMode>(initialViewMode())
  // svelte-ignore state_referenced_locally -- each story mounts a fixed target.
  let fullscreenPanel = $state<FullscreenPanel>(
    target === 'fullscreen-panel' || target === 'mobile-sheet'
      ? 'people'
      : 'none'
  )
  let fullscreenChatTab = $state<ConferenceFullscreenChatTab>('call')
  let layoutMode = $state<ConferenceLayoutMode>('auto')
  // svelte-ignore state_referenced_locally -- each story mounts a fixed target.
  let settingsOpen = $state(target === 'settings')
  let pinnedIdentity = $state<string | null>(null)
  let micEnabled = $state(true)
  let camEnabled = $state(false)
  let captionsEnabled = $state(true)

  provideCanvasChatStore({
    getCanvasId: () => 'canvas-story',
    getUserId: () => 'user-story',
    getEnabled: () => true
  })

  const baseStore = createCanvasConferenceStore({
    getCanvasId: () => 'canvas-story',
    getUserId: () => 'user-story',
    getEnabled: () => true
  })

  const device = (kind: MediaDeviceKind, deviceId: string, label: string) =>
    ({
      kind,
      deviceId,
      groupId: 'story-devices',
      label,
      toJSON: () => ({ kind, deviceId, label })
    }) as MediaDeviceInfo

  const overrides: Record<PropertyKey, () => unknown> = {
    status: () => status,
    isInCall: () => status === 'connected',
    participants: () => conferenceParticipants,
    featured: () =>
      conferenceParticipants.find(
        (participant) => participant.identity === pinnedIdentity
      ) ?? conferenceParticipants[1],
    remoteAudioParticipants: () => [],
    micEnabled: () => micEnabled,
    camEnabled: () => camEnabled,
    screenEnabled: () => false,
    canPlayAudio: () => true,
    pinnedIdentity: () => pinnedIdentity,
    backgroundEffect: () => 'none',
    virtualBgImage: () => null,
    blurRadius: () => 12,
    callSession: () => null,
    callTranscriptionStatus: () => 'not_requested',
    transcriptionStarting: () => false,
    devices: () => ({
      cameras: [device('videoinput', 'camera-story', 'Studio camera')],
      mics: [device('audioinput', 'microphone-story', 'Desk microphone')],
      speakers: [device('audiooutput', 'speaker-story', 'Display speakers')]
    }),
    activeDeviceIds: () => ({
      videoinput: 'camera-story',
      audioinput: 'microphone-story',
      audiooutput: 'speaker-story'
    }),
    hasMic: () => true,
    hasCamera: () => true,
    settingsOpen: () => settingsOpen,
    callActive: () => status !== 'idle',
    participantCount: () => conferenceParticipants.length,
    corner: () => 'bottom-right',
    chatOpen: () => false,
    viewMode: () => viewMode,
    fullscreenPanel: () => fullscreenPanel,
    fullscreenChatTab: () => fullscreenChatTab,
    layoutMode: () => layoutMode,
    callChatEntries: () => conferenceChatEntries,
    callChatUnreadCount: () => 1,
    captionsEnabled: () => captionsEnabled,
    captionsLanguage: () => 'en',
    captionTextSize: () => 'medium',
    captionTextColor: () => 'white',
    captionsState: () => 'active',
    captionSegments: () => [
      {
        id: 'caption-story',
        speakerIdentity: 'user-riley',
        speakerName: 'Riley Chen',
        speakerColor: '#ddd6fe',
        text: 'The design system keeps every interaction consistent.',
        translated: 'The design system keeps every interaction consistent.',
        final: true,
        receivedAt: Date.now()
      }
    ],
    join: () => () => {
      status = 'connected'
      result = 'join'
    },
    leave: () => () => {
      status = 'idle'
      result = 'leave'
    },
    toggleMic: () => () => {
      micEnabled = !micEnabled
      result = 'mic'
    },
    toggleCam: () => () => {
      camEnabled = !camEnabled
      result = 'camera'
    },
    toggleScreenShare: () => () => (result = 'screen'),
    setBackground: () => () => Promise.resolve(),
    setBlurRadius: () => () => undefined,
    pin: () => (identity: string) => {
      pinnedIdentity = pinnedIdentity === identity ? null : identity
      result = identity
    },
    startAudio: () => () => Promise.resolve(),
    startTranscription: () => () => Promise.resolve(),
    setSettingsOpen: () => (value: boolean) => (settingsOpen = value),
    switchDevice: () => () => Promise.resolve(),
    setCorner: () => () => undefined,
    setChatOpen: () => () => undefined,
    setViewMode: () => (value: ConferenceViewMode) => {
      viewMode = value
      result = value
    },
    toggleFullscreenPanel: () => (panel: Exclude<FullscreenPanel, 'none'>) => {
      fullscreenPanel = fullscreenPanel === panel ? 'none' : panel
      result = panel
    },
    setFullscreenChatTab: () => (tab: ConferenceFullscreenChatTab) =>
      (fullscreenChatTab = tab),
    setLayoutMode: () => (mode: ConferenceLayoutMode) => (layoutMode = mode),
    sendCallChatMessage: () => () => Promise.resolve(),
    retryCallChatMessage: () => () => Promise.resolve(),
    dismissCallChatMessage: () => () => undefined,
    markCallChatRead: () => () => undefined,
    toggleCaptions: () => () => (captionsEnabled = !captionsEnabled),
    setCaptionsLanguage: () => () => undefined,
    setCaptionTextSize: () => () => undefined,
    setCaptionTextColor: () => () => undefined
  }

  const store = new Proxy(baseStore, {
    get(targetStore, property, receiver) {
      return (
        overrides[property]?.() ?? Reflect.get(targetStore, property, receiver)
      )
    }
  })
  provideCanvasConferenceStoreInstance(store)
</script>

<div
  class="relative min-h-[44rem] overflow-hidden bg-background p-6 text-foreground"
>
  {#if target === 'canvas-conference'}
    <CanvasConference />
  {:else if target === 'call-chat'}
    <div
      class="h-[36rem] max-w-md overflow-hidden rounded-2xl border border-border bg-card"
    >
      <ConferenceCallChatPanel />
    </div>
  {:else if target === 'settings'}
    <ConferenceSettingsDialog
      getBackgroundThumbnail={storyBackgroundThumbnail}
    />
  {:else if target === 'cc-button'}
    <div class="fixed bottom-10 left-10 rounded-full bg-card p-3 shadow-xl">
      <ConferenceCCButton />
    </div>
  {:else if target === 'call-button'}
    <ConferenceCallButton />
  {:else if target === 'cam-button'}
    <div class="fixed bottom-10 left-10 rounded-full bg-card p-3 shadow-xl">
      <ConferenceCamButton />
    </div>
  {:else if target === 'controls'}
    <div class="fixed bottom-10 left-1/2 -translate-x-1/2">
      <ConferenceControls />
    </div>
  {:else if target === 'meeting-tools'}
    <div class="fixed bottom-10 left-10 rounded-full bg-card p-3 shadow-xl">
      <ConferenceMeetingToolsButton />
    </div>
  {:else if target === 'mic-button'}
    <div class="fixed bottom-10 left-10 rounded-full bg-card p-3 shadow-xl">
      <ConferenceMicButton />
    </div>
  {:else if target === 'fullscreen'}
    <ConferenceFullscreen />
  {:else if target === 'fullscreen-panel'}
    <div class="flex h-[40rem] justify-end"><ConferenceFullscreenPanel /></div>
  {:else if target === 'pip'}
    <ConferencePip />
  {:else if target === 'participant-strip'}
    <div class="group relative mt-24 h-48 w-96 rounded-2xl bg-card">
      <ConferenceParticipantStrip placement="above" />
    </div>
  {:else if target === 'participant-tile'}
    <ConferenceParticipantTile
      participant={conferenceParticipants[1]}
      class="h-72 w-[32rem] rounded-2xl"
    />
  {:else if target === 'screen-tile'}
    <ConferenceScreenTile
      participant={conferenceParticipants[1]}
      class="h-72 w-[32rem] rounded-2xl"
    />
  {:else if target === 'tile-grid'}
    <div
      class="flex h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <ConferenceTileGrid />
    </div>
  {:else if target === 'mobile-canvas-conference'}
    <MobileCanvasConference />
  {:else if target === 'mobile-controls'}
    <div class="relative h-[40rem] overflow-hidden rounded-2xl bg-card">
      <MobileConferenceControls />
    </div>
  {:else if target === 'mobile-fullscreen'}
    <MobileConferenceFullscreen />
  {:else if target === 'mobile-minimized-chip'}
    <MobileConferenceMinimizedChip />
  {:else if target === 'mobile-sheet'}
    <div class="relative h-[42rem] overflow-hidden rounded-2xl bg-card">
      <MobileConferenceSheet />
    </div>
  {:else if target === 'mobile-tile-grid'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileConferenceTileGrid />
    </div>
  {/if}

  <output class="sr-only" data-testid="conference-result">{result}</output>
</div>
