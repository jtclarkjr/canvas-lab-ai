<script lang="ts">
  import Modal from '$lib/components/shared/Modal.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/canvas/conference/index.svelte'

  const store = useCanvasConferenceStore()

  const selectClass =
    'w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60'
</script>

<Modal
  bind:open={() => store.settingsOpen, (value) => store.setSettingsOpen(value)}
  title="Call settings"
  widthClass="max-w-md"
  showClose
>
  <div class="grid gap-4">
    <label class="grid gap-1.5">
      <span class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Camera
      </span>
      <select
        class={selectClass}
        value={store.activeDeviceIds.videoinput ?? store.devices.cameras[0]?.deviceId ?? ''}
        onchange={(event) => void store.switchDevice('videoinput', event.currentTarget.value)}
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
    </label>

    <label class="grid gap-1.5">
      <span class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Microphone
      </span>
      <select
        class={selectClass}
        value={store.activeDeviceIds.audioinput ?? store.devices.mics[0]?.deviceId ?? ''}
        onchange={(event) => void store.switchDevice('audioinput', event.currentTarget.value)}
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
        <span class="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Speaker
        </span>
        <select
          class={selectClass}
          value={store.activeDeviceIds.audiooutput ?? store.devices.speakers[0]?.deviceId ?? ''}
          onchange={(event) => void store.switchDevice('audiooutput', event.currentTarget.value)}
        >
          {#each store.devices.speakers as device (device.deviceId)}
            <option value={device.deviceId}>{device.label || 'Speaker'}</option>
          {/each}
        </select>
      </label>
    {/if}
  </div>
</Modal>
