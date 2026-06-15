<script lang="ts">
  import { MicOff, Pin } from 'lucide-svelte'
  import type { ConferenceParticipant } from '$lib/conference/types'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import { attachTrack } from '../media-actions'

  const store = useCanvasConferenceStore()

  let {
    participant,
    class: extraClass
  }: {
    participant: ConferenceParticipant
    class: string
  } = $props()

  const pinned = $derived(store.pinnedIdentity === participant.identity)
</script>

<button
  type="button"
  class={`relative overflow-hidden bg-secondary/60 text-left transition ${
    pinned
      ? 'ring-2 ring-primary'
      : participant.isSpeaking
        ? 'ring-2 ring-success'
        : ''
  } ${extraClass}`}
  onclick={() => store.pin(participant.identity)}
  aria-label={`${pinned ? 'Unpin' : 'Pin'} ${participant.isLocal ? 'yourself' : participant.name}`}
  aria-pressed={pinned}
>
  {#if participant.videoTrack && participant.camEnabled}
    <video
      use:attachTrack={participant.videoTrack}
      autoplay
      playsinline
      muted
      class={`h-full w-full object-cover ${participant.isLocal ? '-scale-x-100' : ''}`}
    ></video>
  {:else}
    <div class="flex h-full w-full items-center justify-center">
      <span
        class="flex size-20 items-center justify-center rounded-full text-2xl font-bold shadow-inner"
        style={`background-color:${participant.color};color:var(--canvas-avatar-foreground)`}
      >
        {participant.name.trim().slice(0, 2).toUpperCase() || 'ME'}
      </span>
    </div>
  {/if}

  <span
    class="absolute bottom-2 left-2 flex max-w-[70%] items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur"
  >
    {#if pinned}
      <Pin class="size-3" />
    {/if}
    <span class="truncate">
      {participant.isLocal ? 'You' : participant.name}
    </span>
  </span>

  {#if !participant.micEnabled}
    <span
      class="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
      aria-label="Microphone muted"
    >
      <MicOff class="size-3" aria-hidden="true" />
    </span>
  {/if}
</button>
