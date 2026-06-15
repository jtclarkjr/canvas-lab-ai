<script lang="ts">
  import { Check, Video, VideoOff } from 'lucide-svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()

  const camTitle = $derived.by(() => {
    if (!store.hasCamera) return 'No camera found'
    return store.camEnabled ? 'Turn camera off' : 'Turn camera on'
  })
</script>

<div class="group/cam relative" role="group" aria-label="Camera controls">
  <div
    class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-150 group-hover/cam:pointer-events-auto group-hover/cam:opacity-100"
  >
    <div
      class="flex min-w-56 flex-col gap-1 rounded-2xl border border-white/10 bg-black/30 p-2 backdrop-blur-2xl"
      role="group"
      aria-label="Camera settings"
    >
      {#if store.devices.cameras.length > 0}
        <p
          class="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/50"
        >
          Camera
        </p>
        {#each store.devices.cameras as cam (cam.deviceId)}
          <button
            type="button"
            class={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition ${
              (store.activeDeviceIds.videoinput ??
                store.devices.cameras[0]?.deviceId) === cam.deviceId
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:bg-white/10'
            }`}
            onclick={() => void store.switchDevice('videoinput', cam.deviceId)}
          >
            {#if (store.activeDeviceIds.videoinput ?? store.devices.cameras[0]?.deviceId) === cam.deviceId}
              <Check class="size-3.5 shrink-0" />
            {:else}
              <span class="size-3.5 shrink-0"></span>
            {/if}
            <span class="max-w-48 truncate font-medium"
              >{cam.label || 'Camera'}</span
            >
          </button>
        {/each}
      {/if}
      <div class="mx-2 my-1 border-t border-white/10"></div>
      <button
        type="button"
        class={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition ${
          store.backgroundEffect === 'blur'
            ? 'bg-white/20 text-white'
            : 'text-white/80 hover:bg-white/10'
        }`}
        onclick={() =>
          void store.setBackground(
            store.backgroundEffect === 'blur' ? 'none' : 'blur'
          )}
        aria-pressed={store.backgroundEffect === 'blur'}
      >
        {#if store.backgroundEffect === 'blur'}
          <Check class="size-3.5 shrink-0" />
        {:else}
          <span class="size-3.5 shrink-0"></span>
        {/if}
        <span class="font-medium">Blur background</span>
      </button>
      <button
        type="button"
        class="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
        onclick={() => store.setSettingsOpen(true)}
      >
        <span class="size-3.5 shrink-0"></span>
        <span class="font-medium">Backgrounds and effects</span>
      </button>
    </div>
  </div>

  <button
    type="button"
    class={`flex size-11 items-center justify-center rounded-full transition ${
      store.camEnabled
        ? 'bg-secondary text-foreground hover:bg-muted'
        : 'bg-destructive text-destructive-foreground'
    } disabled:cursor-not-allowed disabled:opacity-50`}
    onclick={() => void store.toggleCam()}
    disabled={!store.hasCamera}
    title={camTitle}
    aria-label={store.camEnabled ? 'Turn camera off' : 'Turn camera on'}
    aria-pressed={store.camEnabled}
  >
    {#if store.camEnabled}
      <Video class="size-5" />
    {:else}
      <VideoOff class="size-5" />
    {/if}
  </button>
</div>
