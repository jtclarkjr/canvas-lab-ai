<script lang="ts">
  import { useCanvasConferenceStore } from '#lib/stores/conference/index.svelte.js'
  import ConferenceSettingsDialog from '#lib/components/canvas/conference/ConferenceSettingsDialog.svelte'
  import { attachTrack } from '#lib/components/canvas/conference/media-actions.js'
  import MobileConferenceFullscreen from '#lib/mobile/components/conference/MobileConferenceFullscreen.svelte'
  import MobileConferenceMinimizedChip from '#lib/mobile/components/conference/MobileConferenceMinimizedChip.svelte'

  const store = useCanvasConferenceStore()

  $effect(() => {
    if (store.status !== 'idle' && store.viewMode === 'pip') {
      store.setViewMode('fullscreen')
    }
  })
</script>

{#if store.status !== 'idle'}
  {#if store.viewMode === 'bar'}
    <MobileConferenceMinimizedChip />
  {:else}
    <MobileConferenceFullscreen />
  {/if}

  <ConferenceSettingsDialog />

  {#each store.remoteAudioParticipants as participant (participant.identity)}
    <audio use:attachTrack={participant.audioTrack} autoplay class="hidden"
    ></audio>
  {/each}
{/if}
