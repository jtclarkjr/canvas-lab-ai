<script lang="ts">
  import { Check, Mic, MicOff } from 'lucide-svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()

  const localIsSpeaking = $derived(
    store.participants.find((p) => p.isLocal)?.isSpeaking ?? false
  )

  const micTitle = $derived.by(() => {
    if (!store.hasMic) return 'No microphone found'
    return store.micEnabled ? 'Mute microphone' : 'Unmute microphone'
  })
</script>

<div class="group/mic relative" role="group" aria-label="Microphone controls">
  <div
    class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-150 group-hover/mic:pointer-events-auto group-hover/mic:opacity-100"
  >
    <div
      class="flex min-w-56 flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 p-2 backdrop-blur-2xl"
      role="group"
      aria-label="Microphone settings"
    >
      {#if store.devices.mics.length > 0}
        <p
          class="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50"
        >
          Microphone
        </p>
        {#each store.devices.mics as mic (mic.deviceId)}
          <button
            type="button"
            class={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition ${
              (store.activeDeviceIds.audioinput ??
                store.devices.mics[0]?.deviceId) === mic.deviceId
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:bg-white/10'
            }`}
            onclick={() => void store.switchDevice('audioinput', mic.deviceId)}
          >
            {#if (store.activeDeviceIds.audioinput ?? store.devices.mics[0]?.deviceId) === mic.deviceId}
              <Check class="size-3.5 shrink-0" />
            {:else}
              <span class="size-3.5 shrink-0"></span>
            {/if}
            <span class="max-w-48 truncate font-medium"
              >{mic.label || 'Microphone'}</span
            >
          </button>
        {/each}
      {/if}
      {#if store.devices.speakers.length > 0}
        <p
          class="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/50"
        >
          Speaker
        </p>
        {#each store.devices.speakers as speaker (speaker.deviceId)}
          <button
            type="button"
            class={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition ${
              (store.activeDeviceIds.audiooutput ??
                store.devices.speakers[0]?.deviceId) === speaker.deviceId
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:bg-white/10'
            }`}
            onclick={() =>
              void store.switchDevice('audiooutput', speaker.deviceId)}
          >
            {#if (store.activeDeviceIds.audiooutput ?? store.devices.speakers[0]?.deviceId) === speaker.deviceId}
              <Check class="size-3.5 shrink-0" />
            {:else}
              <span class="size-3.5 shrink-0"></span>
            {/if}
            <span class="max-w-48 truncate font-medium"
              >{speaker.label || 'Speaker'}</span
            >
          </button>
        {/each}
      {/if}
    </div>
  </div>

  {#if store.micEnabled}
    <div
      class="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 flex items-end gap-[3px] rounded-full bg-black/40 px-3 py-2 backdrop-blur transition-opacity duration-150 group-hover/mic:opacity-0"
      aria-hidden="true"
    >
      {#if localIsSpeaking}
        <span
          class="speaking-bar w-[3px] rounded-full bg-white"
          style="animation-delay:0ms"
        ></span>
        <span
          class="speaking-bar w-[3px] rounded-full bg-white"
          style="animation-delay:150ms"
        ></span>
        <span
          class="speaking-bar w-[3px] rounded-full bg-white"
          style="animation-delay:300ms"
        ></span>
      {:else}
        <span
          class="idle-dot rounded-full bg-white/60"
          style="animation-delay:0ms"
        ></span>
        <span
          class="idle-dot rounded-full bg-white/60"
          style="animation-delay:200ms"
        ></span>
        <span
          class="idle-dot rounded-full bg-white/60"
          style="animation-delay:400ms"
        ></span>
      {/if}
    </div>
  {/if}

  <button
    type="button"
    class={`flex size-11 items-center justify-center rounded-full transition ${
      store.micEnabled
        ? 'bg-secondary text-foreground hover:bg-muted'
        : 'bg-destructive text-destructive-foreground'
    } disabled:cursor-not-allowed disabled:opacity-50`}
    onclick={() => void store.toggleMic()}
    disabled={!store.hasMic}
    title={micTitle}
    aria-label={store.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
    aria-pressed={store.micEnabled}
  >
    {#if store.micEnabled}
      <Mic class="size-5" />
    {:else}
      <MicOff class="size-5" />
    {/if}
  </button>
</div>

<style>
  @keyframes bar-bounce {
    0%,
    100% {
      height: 3px;
    }
    50% {
      height: 12px;
    }
  }

  .speaking-bar {
    height: 3px;
    animation: bar-bounce 0.6s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }

  .idle-dot {
    width: 3px;
    height: 3px;
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
</style>
