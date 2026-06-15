<script lang="ts">
  import { MonitorUp } from 'lucide-svelte'
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

  const pinned = $derived(
    store.pinnedIdentity === `${participant.identity}:screen`
  )
</script>

<button
  type="button"
  class={`relative overflow-hidden bg-secondary/60 text-left transition ${
    pinned ? 'ring-2 ring-primary' : ''
  } ${extraClass}`}
  onclick={() => store.pin(`${participant.identity}:screen`)}
  aria-label={`${pinned ? 'Unpin' : 'Pin'} ${participant.isLocal ? 'your' : `${participant.name}'s`} screen`}
  aria-pressed={pinned}
>
  <video
    use:attachTrack={participant.screenShareTrack!}
    autoplay
    playsinline
    muted
    class="h-full w-full object-contain"
  ></video>
  <span
    class="absolute bottom-2 left-2 flex max-w-[70%] items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur"
  >
    <MonitorUp class="size-3 shrink-0" />
    <span class="truncate">
      {participant.isLocal ? 'You' : participant.name} (screen)
    </span>
  </span>
</button>
