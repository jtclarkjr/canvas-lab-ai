<script lang="ts">
  import { Phone } from 'lucide-svelte'
  import { useCanvasConferenceStore } from '$lib/stores/canvas/conference/index.svelte'

  const store = useCanvasConferenceStore()
</script>

{#if !store.enabled}
  <!-- Calls are members-only; public viewers get no entry point. -->
{:else if store.status === 'idle' && !store.callActive}
  <button
    type="button"
    class="toolbar-pill flex h-9 w-9 items-center justify-center"
    onclick={() => void store.join()}
    title="Start a call"
    aria-label="Start a call"
  >
    <Phone class="size-4" />
  </button>
{:else if store.status === 'idle'}
  <button
    type="button"
    class="toolbar-pill flex h-9 items-center gap-2 px-3 text-xs font-semibold"
    onclick={() => void store.join()}
    title="Join the call in progress"
  >
    <span class="relative flex size-2">
      <span
        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"
      ></span>
      <span class="relative inline-flex size-2 rounded-full bg-success"></span>
    </span>
    <Phone class="size-4" />
    <span>Join · {store.participantCount}</span>
  </button>
{:else}
  <div
    class="toolbar-pill flex h-9 items-center gap-2 border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary"
    title={store.status === 'connecting' ? 'Joining call…' : 'In call'}
    aria-label={store.status === 'connecting' ? 'Joining call' : 'In call'}
  >
    <Phone class="size-4" />
    <span>
      {store.status === 'connecting' ? 'Joining…' : store.participantCount}
    </span>
  </div>
{/if}
