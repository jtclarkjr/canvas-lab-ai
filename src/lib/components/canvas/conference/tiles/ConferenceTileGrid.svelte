<script lang="ts">
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import ConferenceParticipantTile from './ConferenceParticipantTile.svelte'
  import ConferenceScreenTile from './ConferenceScreenTile.svelte'

  const store = useCanvasConferenceStore()

  const nonFeatured = $derived(
    store.participants.filter(
      (p) => p.identity !== (store.featured?.identity ?? '')
    )
  )

  const screenParticipants = $derived(
    store.participants.filter((p) => p.screenShareTrack !== null)
  )

  let autoSwitchedLayout = $state(false)
  $effect(() => {
    if (screenParticipants.length > 0) {
      if (store.layoutMode === 'auto') {
        store.setLayoutMode('spotlight')
        autoSwitchedLayout = true
      }
    } else if (autoSwitchedLayout) {
      store.setLayoutMode('auto')
      autoSwitchedLayout = false
    }
  })
</script>

<div
  class={`min-h-0 flex-1 p-4 ${store.layoutMode === 'auto' ? 'overflow-y-auto' : 'overflow-hidden'}`}
>
  {#if store.layoutMode === 'spotlight' && store.participants.length > 0}
    <div class="flex h-full flex-col gap-3">
      <div class="min-h-0 flex-1">
        {#if screenParticipants.length > 0}
          <ConferenceScreenTile
            participant={screenParticipants[0]}
            class="h-full w-full rounded-2xl"
          />
        {:else}
          <ConferenceParticipantTile
            participant={store.featured ?? store.participants[0]}
            class="h-full w-full rounded-2xl"
          />
        {/if}
      </div>
      {#if store.participants.length > 1 || screenParticipants.length > 1}
        <div class="flex h-36 shrink-0 gap-3 overflow-x-auto pb-1">
          {#if screenParticipants.length > 0}
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
          {:else}
            {#each nonFeatured as participant (participant.identity)}
              <ConferenceParticipantTile
                {participant}
                class="aspect-video h-full w-auto shrink-0 rounded-xl"
              />
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {:else if store.layoutMode === 'sidebar' && store.participants.length > 0}
    <div class="flex h-full gap-3">
      <div class="min-h-0 flex-1">
        {#if screenParticipants.length > 0}
          <ConferenceScreenTile
            participant={screenParticipants[0]}
            class="h-full w-full rounded-2xl"
          />
        {:else}
          <ConferenceParticipantTile
            participant={store.featured ?? store.participants[0]}
            class="h-full w-full rounded-2xl"
          />
        {/if}
      </div>
      {#if store.participants.length > 1 || screenParticipants.length > 1}
        <div class="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto">
          {#if screenParticipants.length > 0}
            {#each store.participants as participant (participant.identity)}
              <ConferenceParticipantTile
                {participant}
                class="aspect-video w-full rounded-xl"
              />
            {/each}
            {#each screenParticipants.slice(1) as participant (`${participant.identity}:screen`)}
              <ConferenceScreenTile
                {participant}
                class="aspect-video w-full rounded-xl"
              />
            {/each}
          {:else}
            {#each nonFeatured as participant (participant.identity)}
              <ConferenceParticipantTile
                {participant}
                class="aspect-video w-full rounded-xl"
              />
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="tile-grid mx-auto grid h-full w-full max-w-6xl content-center gap-3"
    >
      {#each store.participants as participant (participant.identity)}
        <ConferenceParticipantTile
          {participant}
          class="aspect-video w-full rounded-2xl"
        />
      {/each}
      {#each screenParticipants as participant (`${participant.identity}:screen`)}
        <ConferenceScreenTile
          {participant}
          class="aspect-video w-full rounded-2xl"
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tile-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  }
</style>
