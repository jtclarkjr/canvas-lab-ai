<script lang="ts">
  import SceneCard from '../SceneCard.svelte'
  import SceneCardLayer from '../SceneCardLayer.svelte'
  import SceneDialog from '../SceneDialog.svelte'
  import SceneEntry from '../SceneEntry.svelte'
  import SceneModeSwitcher from '../SceneModeSwitcher.svelte'
  import SceneResizeHandle from '../SceneResizeHandle.svelte'
  import MobileDocumentChatPanel from '$lib/mobile/components/scenes/MobileDocumentChatPanel.svelte'
  import MobileDocumentScenePanel from '$lib/mobile/components/scenes/MobileDocumentScenePanel.svelte'
  import MobileSceneCard from '$lib/mobile/components/scenes/MobileSceneCard.svelte'
  import MobileSceneCardLayer from '$lib/mobile/components/scenes/MobileSceneCardLayer.svelte'
  import MobileSceneDialog from '$lib/mobile/components/scenes/MobileSceneDialog.svelte'
  import MobileSceneEntry from '$lib/mobile/components/scenes/MobileSceneEntry.svelte'
  import { provideSceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import { documentItems, documentMessages } from '../document/stories/fixtures'
  import type { WorkspaceMode } from '$lib/scenes/types'
  import { emptySceneFixture, sceneFixture } from './fixtures'

  type Target =
    | 'card'
    | 'card-layer'
    | 'dialog'
    | 'entry'
    | 'mode-switcher'
    | 'resize-handle'
    | 'mobile-document-chat'
    | 'mobile-document-panel'
    | 'mobile-card'
    | 'mobile-card-layer'
    | 'mobile-dialog'
    | 'mobile-entry'

  let { target } = $props<{ target: Target }>()

  let mode = $state<WorkspaceMode>('scenes')
  let result = $state('')
  let closed = $state(false)

  const phoneProfile = {
    shell: 'phone' as const,
    isTouchLike: true,
    hasFinePointer: false,
    hasHover: false,
    viewportWidth: 390,
    viewportHeight: 844
  }
  const documentsStore = provideSceneDocumentsStore({
    canvasId: sceneFixture.canvasId,
    initialItemsBySceneId: { [sceneFixture.id]: documentItems }
  })

  const handlers = {
    pointerDown: () => (result = 'pointer-down'),
    pointerMove: () => undefined,
    pointerUp: () => undefined,
    pointerCancel: () => undefined,
    open: (_event: Event, sceneId: string) => (result = `open:${sceneId}`),
    resizePointerDown: (_event: PointerEvent, sceneId: string) =>
      (result = `resize:${sceneId}`),
    resizePointerMove: () => undefined,
    resizePointerUp: () => undefined,
    resizePointerCancel: () => undefined
  }
</script>

<div
  class="relative min-h-[40rem] overflow-hidden bg-background p-6 text-foreground"
>
  {#if target === 'resize-handle'}
    <div class="relative h-48 w-72 rounded-2xl border border-border bg-card">
      <SceneResizeHandle sceneId={sceneFixture.id} {handlers} />
    </div>
  {:else if target === 'mode-switcher'}
    <SceneModeSwitcher
      {mode}
      workflowEnabled
      onModeChange={(next) => {
        mode = next
        result = next
      }}
    />
  {:else if target === 'entry'}
    <div class="h-[36rem] rounded-2xl border border-border/60 bg-card">
      <SceneEntry onStart={(start) => (result = JSON.stringify(start))} />
    </div>
  {:else if target === 'card'}
    <SceneCard
      scene={sceneFixture}
      camera={{ x: 0, y: 0, scale: 1 }}
      canModify
      activity={{
        sceneId: sceneFixture.id,
        userId: 'user-ada',
        userName: 'Ada',
        kind: 'generating'
      }}
      {handlers}
      interactive
      canActivate={false}
      onActivate={(sceneId) => (result = `activate:${sceneId}`)}
    />
  {:else if target === 'card-layer'}
    <SceneCardLayer
      scenes={[sceneFixture]}
      camera={{ x: 0, y: 0, scale: 1 }}
      mode="scenes"
      selectedTool="select"
      canEdit
      canModifyScene={() => true}
      activity={{}}
      {handlers}
      onActivateScene={(sceneId) => (result = `activate:${sceneId}`)}
      onCreateScene={() => (result = 'create')}
    />
  {:else if target === 'dialog' && !closed}
    <SceneDialog
      canvasId="canvas-story"
      scene={emptySceneFixture}
      userId="user-james"
      originRect={null}
      canModify
      documentRevision={0}
      liveMessages={[]}
      remoteActivity={null}
      remoteStreamingText=""
      onClose={() => (closed = true)}
      onPatchScene={async () => undefined}
      onDeleteScene={() => (result = 'deleted')}
      onBroadcastActivity={() => undefined}
    />
  {:else if target === 'mobile-document-chat'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileDocumentChatPanel
        initialMessages={documentMessages}
        buildBody={() => ({ canvasId: sceneFixture.canvasId })}
        canModify
        canSend
        currentUserId="user-james"
        liveMessages={[]}
        remoteActivity={null}
        remoteStreamingText=""
        initialPrompt={null}
        onInitialPromptSent={() => undefined}
        onBroadcastActivity={() => undefined}
        onTurnFinished={() => undefined}
        onLiveDraftChange={() => undefined}
        onMessagesSnapshot={() => undefined}
        webSearch
        onWebSearchToggle={() => undefined}
      />
    </div>
  {:else if target === 'mobile-document-panel'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileDocumentScenePanel
        canvasId={sceneFixture.canvasId}
        scene={sceneFixture}
        userId="user-james"
        canModify
        documentRevision={0}
        liveMessages={[]}
        remoteActivity={null}
        remoteStreamingText=""
        sceneDocumentsStore={documentsStore}
        initialPrompt={null}
        onInitialPromptSent={() => undefined}
        onBroadcastActivity={() => undefined}
      />
    </div>
  {:else if target === 'mobile-card'}
    <MobileSceneCard
      scene={sceneFixture}
      camera={{ x: 0, y: 0, scale: 0.55 }}
      canModify
      activity={{
        sceneId: sceneFixture.id,
        userId: 'user-ada',
        userName: 'Ada',
        kind: 'generating'
      }}
      {handlers}
      interactive
      deviceProfile={phoneProfile}
    />
  {:else if target === 'mobile-card-layer'}
    <MobileSceneCardLayer
      scenes={[sceneFixture]}
      camera={{ x: 0, y: 0, scale: 0.55 }}
      mode="scenes"
      canModifyScene={() => true}
      activity={{}}
      {handlers}
      deviceProfile={phoneProfile}
    />
  {:else if target === 'mobile-dialog' && !closed}
    <MobileSceneDialog
      canvasId={emptySceneFixture.canvasId}
      scene={emptySceneFixture}
      userId="user-james"
      originRect={null}
      canModify
      sceneDocumentsStore={documentsStore}
      documentRevision={0}
      liveMessages={[]}
      remoteActivity={null}
      remoteStreamingText=""
      deviceProfile={phoneProfile}
      onClose={() => (closed = true)}
      onPatchScene={async () => undefined}
      onDeleteScene={() => (result = 'deleted')}
      onBroadcastActivity={() => undefined}
    />
  {:else if target === 'mobile-entry'}
    <div
      class="h-[40rem] overflow-hidden rounded-2xl border border-border bg-card"
    >
      <MobileSceneEntry onStart={(start) => (result = JSON.stringify(start))} />
    </div>
  {/if}

  <output class="sr-only" data-testid="scene-result">{result}</output>
  <output class="sr-only" data-testid="scene-closed">{String(closed)}</output>
</div>
