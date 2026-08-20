<script lang="ts">
  import type { Canvas } from '$lib/canvas/schema'
  import MobileCanvasWorkspace from '../MobileCanvasWorkspace.svelte'
  import MobileRequestEditAccessBanner from '../MobileRequestEditAccessBanner.svelte'

  type Target = 'workspace' | 'view' | 'request-access' | 'chrome'

  let { target } = $props<{ target: Target }>()

  const canvasId = 'canvas-mobile-story'
  const userId = 'user-story'
  const canvases: Canvas[] = [
    {
      id: canvasId,
      title: 'Research canvas',
      createdBy: userId,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
      visibility: 'private',
      iconPath: null,
      iconUrl: null,
      role: 'owner'
    }
  ]
  const phoneProfile = {
    shell: 'phone' as const,
    isTouchLike: true,
    hasFinePointer: false,
    hasHover: false,
    viewportWidth: 390,
    viewportHeight: 844
  }
</script>

<div class="relative h-[46rem] overflow-hidden bg-background text-foreground">
  {#if target === 'request-access'}
    <MobileRequestEditAccessBanner
      {canvasId}
      isPublicViewer
      isAnonymousPublicViewer
    />
  {:else}
    <!--
      The view and chrome stories intentionally render through the production coordinator.
      This preserves their real context, lifecycle, and realtime ownership boundaries.
    -->
    <MobileCanvasWorkspace
      {canvasId}
      {userId}
      userEmail="alex@example.com"
      role="owner"
      canvasTitle="Research canvas"
      initialCanvases={canvases}
      initialElements={[]}
      initialScenes={[]}
      initialWorkflows={[]}
      workflowEnabled
      deviceProfile={phoneProfile}
    />
  {/if}
</div>
