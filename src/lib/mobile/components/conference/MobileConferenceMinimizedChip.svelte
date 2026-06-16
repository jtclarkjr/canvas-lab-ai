<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { scale } from 'svelte/transition'
  import { LoaderCircle, Maximize2, Phone } from 'lucide-svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()

  const label = $derived.by(() => {
    if (store.status === 'connecting') return 'Joining...'
    if (store.status === 'reconnecting') return 'Reconnecting...'
    const speaker = store.featured
    if (speaker) return speaker.isLocal ? 'You' : speaker.name
    return `Call · ${store.participantCount}`
  })
</script>

<div
  class="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 w-[min(10rem,calc(100vw-7rem))] -translate-x-1/2"
  data-camera-exempt
>
  <div
    class="toolbar-pill pointer-events-auto flex h-10 w-full items-center gap-1 p-1"
    style="transform-origin:top center"
    transition:scale={{
      start: 0.82,
      opacity: 0,
      duration: 170,
      easing: cubicOut
    }}
  >
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2 text-left text-xs font-semibold text-foreground"
      onclick={() => store.setViewMode('fullscreen')}
      aria-label="Return to call"
    >
      {#if store.status === 'connecting' || store.status === 'reconnecting'}
        <LoaderCircle
          class="size-3.5 shrink-0 animate-spin"
          aria-hidden="true"
        />
      {:else}
        <Phone class="size-3.5 shrink-0 text-primary" aria-hidden="true" />
      {/if}
      <span class="truncate">{label}</span>
    </button>

    <button
      type="button"
      class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      onclick={() => store.setViewMode('fullscreen')}
      aria-label="Maximize call"
    >
      <Maximize2 class="size-4" aria-hidden="true" />
    </button>
  </div>
</div>
