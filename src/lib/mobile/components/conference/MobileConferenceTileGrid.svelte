<script lang="ts">
  import { useCanvasConferenceStore } from '#lib/stores/conference/index.svelte.js'
  import ConferenceParticipantTile from '#lib/components/canvas/conference/tiles/ConferenceParticipantTile.svelte'
  import ConferenceScreenTile from '#lib/components/canvas/conference/tiles/ConferenceScreenTile.svelte'

  const store = useCanvasConferenceStore()

  const screenParticipants = $derived(
    store.participants.filter((participant) => participant.screenShareTrack)
  )
  const featured = $derived(store.featured ?? store.participants[0] ?? null)
  const nonFeatured = $derived(
    store.participants.filter(
      (participant) => participant.identity !== (featured?.identity ?? '')
    )
  )
</script>

<div class="h-full min-h-0 p-3">
  {#if store.participants.length === 0}
    <div
      class="flex h-full items-center justify-center text-sm text-muted-foreground"
    >
      Waiting for call participants...
    </div>
  {:else if screenParticipants.length > 0}
    <div class="flex h-full min-h-0 flex-col gap-2">
      <div class="min-h-0 flex-1">
        <ConferenceScreenTile
          participant={screenParticipants[0]}
          class="h-full w-full rounded-2xl"
        />
      </div>
      <div class="flex h-24 shrink-0 gap-2 overflow-x-auto pb-1">
        {#each store.participants as participant (participant.identity)}
          <ConferenceParticipantTile
            {participant}
            class="aspect-video h-full w-auto shrink-0 rounded-xl"
          />
        {/each}
        {#each screenParticipants.slice(1) as participant (`${participant.identity}:screen`)}
          <ConferenceScreenTile
            {participant}
            class="aspect-video h-full w-auto shrink-0 rounded-xl"
          />
        {/each}
      </div>
    </div>
  {:else if store.participants.length === 1 && featured}
    <ConferenceParticipantTile
      participant={featured}
      class="h-full w-full rounded-2xl"
    />
  {:else if featured}
    <div class="flex h-full min-h-0 flex-col gap-2">
      <div class="min-h-0 flex-1">
        <ConferenceParticipantTile
          participant={featured}
          class="h-full w-full rounded-2xl"
        />
      </div>
      <div class="flex h-24 shrink-0 gap-2 overflow-x-auto pb-1">
        {#each nonFeatured as participant (participant.identity)}
          <ConferenceParticipantTile
            {participant}
            class="aspect-video h-full w-auto shrink-0 rounded-xl"
          />
        {/each}
      </div>
    </div>
  {/if}
</div>
