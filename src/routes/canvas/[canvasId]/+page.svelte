<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import CanvasWorkspaceRouter from '$lib/workspace/CanvasWorkspaceRouter.svelte'
  import RequestAccessScreen from '$lib/components/canvas/RequestAccessScreen.svelte'
  import type { CanvasRole } from '$lib/canvas/roles'
  import type { Canvas } from '$lib/canvas/schema'
  import type { CanvasElement } from '$lib/workspace/schema'
  import { provideSceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import type { Scene, SceneDocumentListItem } from '$lib/scenes/schema'
  import type { Workflow } from '$lib/workflows/schema'
  import { sleep } from '$lib/utils'

  const CANVAS_ENTRY_TRANSITION_HOLD_MS = 80

  let { data } = $props<{
    data: {
      canvasId: string
      userId?: string
      userEmail?: string
      canvasList?: { items: Canvas[] }
      initialElements?: CanvasElement[]
      initialScenes?: Scene[]
      initialWorkflows?: Workflow[]
      workflowEnabled?: boolean
      sceneDocumentListsBySceneId?: Record<string, SceneDocumentListItem[]>
      access?:
        | { state: 'member'; role: CanvasRole; canvasTitle: string }
        | { state: 'public-viewer'; canvasTitle: string }
        | { state: 'anonymous-public-viewer'; canvasTitle: string }
        | { state: 'no-access' }
        | { state: 'not-found' }
    }
  }>()

  let showCanvasEntryTransition = $state(true)
  const canShowCanvasEntryTransition = $derived(
    data.access?.state !== 'no-access' && data.access?.state !== 'not-found'
  )

  // svelte-ignore state_referenced_locally -- seeds the context store once;
  // the effect below syncs fresh route data after invalidation.
  const sceneDocumentsStore = provideSceneDocumentsStore({
    canvasId: data.canvasId,
    initialItemsBySceneId: data.sceneDocumentListsBySceneId ?? {}
  })

  $effect(() => {
    sceneDocumentsStore.setCanvas(
      data.canvasId,
      data.sceneDocumentListsBySceneId ?? {}
    )
  })

  onMount(() => {
    let cancelled = false
    requestAnimationFrame(() => {
      void sleep(CANVAS_ENTRY_TRANSITION_HOLD_MS).then(() => {
        if (!cancelled) {
          showCanvasEntryTransition = false
        }
      })
    })

    return () => {
      cancelled = true
    }
  })
</script>

{#if data.access?.state === 'no-access'}
  <RequestAccessScreen canvasId={data.canvasId} />
{:else if data.access?.state === 'not-found'}
  <main
    class="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background"
  >
    <h1 class="text-2xl font-bold text-foreground">Canvas not found</h1>
    <p class="text-sm text-muted-foreground">
      This canvas does not exist or may have been deleted.
    </p>
    <a
      href="/home"
      class="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
    >
      Back to dashboard
    </a>
  </main>
{:else if data.access?.state === 'public-viewer' || data.access?.state === 'anonymous-public-viewer'}
  <CanvasWorkspaceRouter
    canvasId={data.canvasId}
    userId={data.userId ?? ''}
    userEmail={data.userEmail}
    role="reader"
    isPublicViewer
    isAnonymousPublicViewer={data.access.state === 'anonymous-public-viewer'}
    canvasTitle={data.access.canvasTitle}
    initialCanvases={data.canvasList?.items ?? []}
    initialElements={data.initialElements ?? []}
    initialScenes={data.initialScenes ?? []}
    initialWorkflows={data.initialWorkflows ?? []}
    workflowEnabled={data.workflowEnabled ?? false}
  />
{:else}
  <CanvasWorkspaceRouter
    canvasId={data.canvasId}
    userId={data.userId ?? ''}
    userEmail={data.userEmail}
    role={data.access?.role ?? 'owner'}
    canvasTitle={data.access?.canvasTitle}
    initialCanvases={data.canvasList?.items ?? []}
    initialElements={data.initialElements ?? []}
    initialScenes={data.initialScenes ?? []}
    initialWorkflows={data.initialWorkflows ?? []}
    workflowEnabled={data.workflowEnabled ?? false}
  />
{/if}

{#if showCanvasEntryTransition && canShowCanvasEntryTransition}
  <div
    out:fade={{ duration: 320 }}
    class="fixed inset-0 z-[80] bg-background/75 backdrop-blur-md"
    aria-hidden="true"
  ></div>
{/if}
