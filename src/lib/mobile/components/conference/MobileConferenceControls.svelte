<script lang="ts">
  import {
    Mic,
    MicOff,
    PhoneOff,
    Video,
    VideoOff,
    Volume2
  } from 'lucide-svelte'
  import ConferenceMeetingToolsButton from '$lib/components/canvas/conference/controls/ConferenceMeetingToolsButton.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()
</script>

<div
  class="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
  data-camera-exempt
>
  {#if !store.canPlayAudio}
    <button
      type="button"
      class="pointer-events-auto mx-auto mb-2 flex h-9 items-center gap-2 rounded-full bg-warning px-3 text-xs font-bold text-warning-foreground shadow-lg"
      onclick={() => void store.startAudio()}
    >
      <Volume2 class="size-4" aria-hidden="true" />
      Tap to unmute call
    </button>
  {/if}

  <div
    class="pointer-events-auto mx-auto flex w-fit items-center gap-3 rounded-full border border-border/70 bg-card/95 p-2 text-card-foreground shadow-2xl backdrop-blur"
    role="toolbar"
    aria-label="Call controls"
  >
    <button
      type="button"
      class={`flex size-12 items-center justify-center rounded-full transition ${
        store.micEnabled
          ? 'bg-secondary text-foreground'
          : 'bg-destructive text-destructive-foreground'
      } disabled:cursor-not-allowed disabled:opacity-50`}
      onclick={() => void store.toggleMic()}
      disabled={!store.hasMic}
      aria-label={store.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
      aria-pressed={store.micEnabled}
    >
      {#if store.micEnabled}
        <Mic class="size-5" aria-hidden="true" />
      {:else}
        <MicOff class="size-5" aria-hidden="true" />
      {/if}
    </button>

    <ConferenceMeetingToolsButton />

    <button
      type="button"
      class={`flex size-12 items-center justify-center rounded-full transition ${
        store.camEnabled
          ? 'bg-secondary text-foreground'
          : 'bg-destructive text-destructive-foreground'
      } disabled:cursor-not-allowed disabled:opacity-50`}
      onclick={() => void store.toggleCam()}
      disabled={!store.hasCamera}
      aria-label={store.camEnabled ? 'Turn camera off' : 'Turn camera on'}
      aria-pressed={store.camEnabled}
    >
      {#if store.camEnabled}
        <Video class="size-5" aria-hidden="true" />
      {:else}
        <VideoOff class="size-5" aria-hidden="true" />
      {/if}
    </button>

    <button
      type="button"
      class="flex h-12 items-center justify-center rounded-full bg-destructive px-5 text-destructive-foreground transition hover:opacity-90"
      onclick={() => void store.leave()}
      aria-label="Leave call"
    >
      <PhoneOff class="size-5" aria-hidden="true" />
    </button>
  </div>
</div>
