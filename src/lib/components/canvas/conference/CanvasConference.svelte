<script lang="ts">
  import { useCanvasConferenceStore } from '$lib/stores/canvas/conference/index.svelte'
  import ConferenceFullscreen from '$lib/components/canvas/conference/ConferenceFullscreen.svelte'
  import ConferencePip from '$lib/components/canvas/conference/ConferencePip.svelte'
  import ConferenceSettingsDialog from '$lib/components/canvas/conference/ConferenceSettingsDialog.svelte'
  import { attachTrack } from '$lib/components/canvas/conference/media-actions'

  const store = useCanvasConferenceStore()
</script>

{#if store.status !== 'idle'}
  {#if store.viewMode === 'fullscreen'}
    <ConferenceFullscreen />
  {:else}
    <ConferencePip />
  {/if}
  <ConferenceSettingsDialog />

  <!-- Remote audio plays through dedicated sinks that survive view-mode
       switches (the visible <video> tiles all stay muted), so audio never
       drops and switchActiveDevice('audiooutput') applies everywhere. -->
  {#each store.remoteAudioParticipants as participant (participant.identity)}
    <audio use:attachTrack={participant.audioTrack} autoplay class="hidden"></audio>
  {/each}
{/if}
