<script lang="ts">
  import { VideoOff } from 'lucide-svelte'
  import { Dialog as Modal } from '$lib/components/ui'
  import { BG_PRESETS, bgThumbnailUrl } from '$lib/conference/backgrounds'
  import type { BgPreset } from '$lib/conference/types'
  import { attachTrack } from '$lib/components/canvas/conference/media-actions'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  let { getBackgroundThumbnail = bgThumbnailUrl } = $props<{
    getBackgroundThumbnail?: typeof bgThumbnailUrl
  }>()

  const store = useCanvasConferenceStore()

  const localVideoTrack = $derived(
    store.participants.find((p) => p.isLocal)?.videoTrack ?? null
  )

  const selectClass =
    'w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60'

  function isActive(preset: BgPreset) {
    if (preset.type !== store.backgroundEffect) return false
    if (preset.type === 'virtual')
      return store.virtualBgImage === preset.imagePath
    return true
  }

  function selectPreset(preset: BgPreset) {
    if (preset.type === 'virtual') {
      void store.setBackground('virtual', preset.imagePath)
    } else {
      void store.setBackground(preset.type)
    }
  }
</script>

<Modal
  bind:open={() => store.settingsOpen, (value) => store.setSettingsOpen(value)}
  title="Call settings"
  widthClass="max-w-md"
  showClose
>
  <div class="grid gap-5">
    <!-- Camera section -->
    <div class="grid gap-2">
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
      </div>

      <!-- Camera device selector -->
      <select
        class={selectClass}
        aria-label="Camera device"
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

    <!-- Background section -->
    <div class="grid gap-2">
      <span
        class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
      >
        Background
      </span>

      <!-- Preset tiles -->
      <div class="flex gap-2 overflow-x-auto pb-1">
        {#each BG_PRESETS as preset (preset.id)}
          {@const active = isActive(preset)}
          {@const thumb = getBackgroundThumbnail(preset)}
          <button
            type="button"
            class={`group flex shrink-0 flex-col items-center gap-1.5 rounded-lg p-1 transition ${
              active ? 'ring-2 ring-primary' : 'hover:bg-muted'
            }`}
            onclick={() => selectPreset(preset)}
            aria-pressed={active}
            aria-label={preset.label}
          >
            <!-- Thumbnail -->
            <div
              class="h-[54px] w-24 overflow-hidden rounded-md border border-border/50"
            >
              {#if preset.type === 'none'}
                <div
                  class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"
                >
                  <VideoOff class="size-5 opacity-50" />
                </div>
              {:else if preset.type === 'blur'}
                <div
                  class="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/5 backdrop-blur"
                >
                  <span class="text-lg opacity-40">⬛</span>
                  <div
                    class="absolute inset-0 rounded-md"
                    style="backdrop-filter:blur(6px)"
                  ></div>
                </div>
              {:else if thumb}
                <img
                  src={thumb}
                  alt=""
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
              {/if}
            </div>
            <span
              class={`text-[11px] font-medium ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {preset.label}
            </span>
          </button>
        {/each}
      </div>

      <!-- Blur intensity (only when blur is selected) -->
      {#if store.backgroundEffect === 'blur'}
        <div class="flex items-center gap-3 px-1">
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
    </div>

    <!-- Microphone -->
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

    <!-- Speaker (hidden on Safari — no setSinkId) -->
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
