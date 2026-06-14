<script lang="ts">
  import { VideoOff } from 'lucide-svelte'
  import Modal from '$lib/components/shared/Modal.svelte'
  import { attachTrack } from '$lib/components/canvas/conference/media-actions'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()

  const localVideoTrack = $derived(
    store.participants.find((p) => p.isLocal)?.videoTrack ?? null
  )

  const selectClass =
    'w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60'
</script>

<Modal
  bind:open={() => store.settingsOpen, (value) => store.setSettingsOpen(value)}
  title="Call settings"
  widthClass="max-w-md"
  showClose
>
  <div class="grid gap-5">
    <div class="grid gap-1.5">
      <span
        class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
      >
        Camera
      </span>

      <!-- Live video preview -->
      <div
        class="relative aspect-video w-full overflow-hidden rounded-xl bg-muted"
      >
        {#if localVideoTrack}
          <video
            use:attachTrack={localVideoTrack}
            autoplay
            playsinline
            muted
            class="-scale-x-100 h-full w-full object-cover"
          ></video>
        {:else}
          <div
            class="flex h-full w-full items-center justify-center text-muted-foreground"
          >
            <VideoOff class="size-8 opacity-40" />
          </div>
        {/if}

        <!-- Blur toggle overlay button -->
        <button
          type="button"
          class={`absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow transition ${
            store.blurEnabled
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
          onclick={() => void store.toggleBlur()}
          aria-pressed={store.blurEnabled}
        >
          {store.blurEnabled ? 'Blur on' : 'Blur off'}
        </button>
      </div>

      <!-- Blur intensity slider -->
      {#if store.blurEnabled}
        <div class="flex items-center gap-3">
          <span class="w-16 text-xs text-muted-foreground">Intensity</span>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={store.blurRadius}
            oninput={(e) =>
              void store.setBlurRadius(Number(e.currentTarget.value))}
            class="h-1.5 flex-1 cursor-pointer accent-primary"
            aria-label="Blur intensity"
          />
          <span
            class="w-6 text-right text-xs tabular-nums text-muted-foreground"
            >{store.blurRadius}</span
          >
        </div>
      {/if}

      <!-- Camera device selector -->
      <select
        class={selectClass}
        value={store.activeDeviceIds.videoinput ??
          store.devices.cameras[0]?.deviceId ??
          ''}
        onchange={(event) =>
          void store.switchDevice('videoinput', event.currentTarget.value)}
        disabled={store.devices.cameras.length === 0}
      >
        {#if store.devices.cameras.length === 0}
          <option value="">No camera found</option>
        {:else}
          {#each store.devices.cameras as device (device.deviceId)}
            <option value={device.deviceId}>{device.label || 'Camera'}</option>
          {/each}
        {/if}
      </select>
    </div>

    <label class="grid gap-1.5">
      <span
        class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
      >
        Microphone
      </span>
      <select
        class={selectClass}
        value={store.activeDeviceIds.audioinput ??
          store.devices.mics[0]?.deviceId ??
          ''}
        onchange={(event) =>
          void store.switchDevice('audioinput', event.currentTarget.value)}
        disabled={store.devices.mics.length === 0}
      >
        {#if store.devices.mics.length === 0}
          <option value="">No microphone found</option>
        {:else}
          {#each store.devices.mics as device (device.deviceId)}
            <option value={device.deviceId}>
              {device.label || 'Microphone'}
            </option>
          {/each}
        {/if}
      </select>
    </label>

    <!-- Speaker selection needs setSinkId, which Safari doesn't expose; it
         enumerates zero outputs there, so the row hides itself. -->
    {#if store.devices.speakers.length > 0}
      <label class="grid gap-1.5">
        <span
          class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Speaker
        </span>
        <select
          class={selectClass}
          value={store.activeDeviceIds.audiooutput ??
            store.devices.speakers[0]?.deviceId ??
            ''}
          onchange={(event) =>
            void store.switchDevice('audiooutput', event.currentTarget.value)}
        >
          {#each store.devices.speakers as device (device.deviceId)}
            <option value={device.deviceId}>{device.label || 'Speaker'}</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>
</Modal>
