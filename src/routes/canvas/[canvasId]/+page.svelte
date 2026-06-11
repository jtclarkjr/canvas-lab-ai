<script lang="ts">
  import CanvasWorkspace from '$lib/components/canvas/CanvasWorkspace.svelte'
  import RequestAccessScreen from '$lib/components/canvas/RequestAccessScreen.svelte'
  import type { CanvasRole } from '$lib/canvas/roles'

  let { data } = $props<{
    data: {
      canvasId: string
      userId?: string
      userEmail?: string
      access?:
        | { state: 'member'; role: CanvasRole; canvasTitle: string }
        | { state: 'no-access' }
        | { state: 'not-found' }
    }
  }>()
</script>

{#if data.access?.state === 'no-access'}
  <RequestAccessScreen canvasId={data.canvasId} />
{:else if data.access?.state === 'not-found'}
  <div class="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background">
    <h1 class="text-2xl font-bold text-foreground">Canvas not found</h1>
    <p class="text-sm text-muted-foreground">
      This canvas does not exist or may have been deleted.
    </p>
    <a
      href="/"
      class="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
    >
      Back to dashboard
    </a>
  </div>
{:else}
  <CanvasWorkspace
    canvasId={data.canvasId}
    userId={data.userId ?? ''}
    userEmail={data.userEmail}
    role={data.access?.role ?? 'owner'}
  />
{/if}
