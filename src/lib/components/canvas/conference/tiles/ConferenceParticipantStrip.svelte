<script lang="ts">
  import { MicOff } from 'lucide-svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import { attachTrack } from '$lib/components/canvas/conference/media-actions'

  let { placement } = $props<{ placement: 'above' | 'below' }>()

  const store = useCanvasConferenceStore()

  const MAX_TILES = 5
  const visible = $derived(store.participants.slice(0, MAX_TILES))
  const overflow = $derived(store.participants.length - MAX_TILES)
</script>

<!-- Hover-revealed roster on the PiP edge facing screen center. Clicking a
     tile pins that participant as the featured video. -->
<div
  class={`absolute left-1 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${
    placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
  }`}
>
  {#each visible as participant (participant.identity)}
    <button
      type="button"
      class={`relative size-9 shrink-0 overflow-hidden rounded-full border border-background/80 shadow transition ${
        store.pinnedIdentity === participant.identity
          ? 'ring-2 ring-primary'
          : participant.isSpeaking
            ? 'ring-2 ring-success'
            : ''
      }`}
      onclick={() => store.pin(participant.identity)}
      aria-label={`${store.pinnedIdentity === participant.identity ? 'Unpin' : 'Pin'} ${participant.isLocal ? 'yourself' : participant.name}${!participant.micEnabled ? ' (muted)' : ''}`}
      aria-pressed={store.pinnedIdentity === participant.identity}
    >
      {#if participant.videoTrack && participant.camEnabled}
        <video
          use:attachTrack={participant.videoTrack}
          autoplay
          playsinline
          muted
          aria-label={participant.isLocal
            ? 'Your video'
            : `${participant.name}'s video`}
          class={`h-full w-full object-cover ${participant.isLocal ? '-scale-x-100' : ''}`}
        ></video>
      {:else}
        <span
          class="flex h-full w-full items-center justify-center text-[10px] font-bold"
          style={`background-color:${participant.color};color:var(--canvas-avatar-foreground)`}
        >
          {participant.name.trim().slice(0, 2).toUpperCase() || 'ME'}
        </span>
      {/if}
      {#if !participant.micEnabled}
        <span
          class="absolute bottom-0 right-0 flex size-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
          aria-label="Microphone muted"
        >
          <MicOff class="size-2" aria-hidden="true" />
        </span>
      {/if}
    </button>
  {/each}
  {#if overflow > 0}
    <span
      class="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[10px] font-bold text-card-foreground shadow"
    >
      +{overflow}
    </span>
  {/if}
</div>
