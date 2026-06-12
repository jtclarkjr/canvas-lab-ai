<script lang="ts">
  import CanvasWorkspace from '$lib/components/canvas/CanvasWorkspace.svelte'
  import RequestAccessScreen from '$lib/components/canvas/RequestAccessScreen.svelte'
  import type { CanvasRole } from '$lib/canvas/roles'
  import type { Canvas } from '$lib/canvas/schema'
  import { provideSceneDocumentsStore } from '$lib/stores/canvas/scenes/documents.svelte'
  import type { SceneDocumentListItem } from '$lib/scenes/schema'

  let { data } = $props<{
    data: {
      canvasId: string
      userId?: string
      userEmail?: string
      canvasList?: { items: Canvas[] }
      sceneDocumentListsBySceneId?: Record<string, SceneDocumentListItem[]>
      access?:
        | { state: 'member'; role: CanvasRole; canvasTitle: string }
        | { state: 'public-viewer'; canvasTitle: string }
        | { state: 'no-access' }
        | { state: 'not-found' }
    }
  }>()

  // svelte-ignore state_referenced_locally -- seeds the context store once;
  // the effect below syncs fresh route data after invalidation.
  const sceneDocumentsStore = provideSceneDocumentsStore({
    canvasId: data.canvasId,
    initialItemsBySceneId: data.sceneDocumentListsBySceneId ?? {}
  })

  $effect(() => {
    sceneDocumentsStore.setCanvas(data.canvasId, data.sceneDocumentListsBySceneId ?? {})
  })
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
{:else if data.access?.state === 'public-viewer'}
  <CanvasWorkspace
    canvasId={data.canvasId}
    userId={data.userId ?? ''}
    userEmail={data.userEmail}
    role="reader"
    isPublicViewer
    canvasTitle={data.access.canvasTitle}
    initialCanvases={data.canvasList?.items ?? []}
  />
{:else}
  <CanvasWorkspace
    canvasId={data.canvasId}
    userId={data.userId ?? ''}
    userEmail={data.userEmail}
    role={data.access?.role ?? 'owner'}
    canvasTitle={data.access?.canvasTitle}
    initialCanvases={data.canvasList?.items ?? []}
  />
{/if}
