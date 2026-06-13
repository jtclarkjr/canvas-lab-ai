<script lang="ts">
  import { onMount } from 'svelte'
  import type { CanvasRole } from '$lib/canvas/roles'
  import type { Canvas } from '$lib/canvas/schema'
  import type { CanvasElement } from '$lib/workspace/schema'
  import type { Scene } from '$lib/scenes/schema'
  import { createCanvasWorkspaceStore } from '$lib/stores/workspace/index.svelte'
  import { provideCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { provideCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import { useSceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import CanvasActionToolbar from '$lib/components/canvas/workspace/CanvasActionToolbar.svelte'
  import CanvasPresenceActions from '$lib/components/canvas/workspace/CanvasPresenceActions.svelte'
  import CanvasSurface from '$lib/components/canvas/CanvasSurface.svelte'
  import TextEditor from '$lib/components/shared/TextEditor.svelte'
  import CanvasTitleSwitcher from '$lib/components/canvas/workspace/CanvasTitleSwitcher.svelte'
  import CanvasZoomControls from '$lib/components/canvas/workspace/CanvasZoomControls.svelte'
  import CanvasChat from '$lib/components/canvas/chat/CanvasChat.svelte'
  import CanvasConference from '$lib/components/canvas/conference/CanvasConference.svelte'
  import DiagramToolbar from '$lib/components/canvas/workspace/DiagramToolbar.svelte'
  import DrawingToolbar from '$lib/components/canvas/workspace/DrawingToolbar.svelte'
  import LiveCursors from '$lib/components/canvas/workspace/LiveCursors.svelte'
  import RequestEditAccessBanner from '$lib/components/canvas/workspace/RequestEditAccessBanner.svelte'
  import ShareDialog from '$lib/components/canvas/workspace/ShareDialog.svelte'
  import TextFormattingToolbar from '$lib/components/canvas/workspace/TextFormattingToolbar.svelte'
  import SceneCardLayer from '$lib/components/canvas/scenes/SceneCardLayer.svelte'
  import SceneDialog from '$lib/components/canvas/scenes/SceneDialog.svelte'
  import SceneModeSwitcher from '$lib/components/canvas/scenes/SceneModeSwitcher.svelte'

  let {
    canvasId,
    userId,
    userEmail,
    role = 'owner',
    isPublicViewer = false,
    canvasTitle,
    initialCanvases,
    initialElements,
    initialScenes
  } = $props<{
    canvasId: string
    userId: string
    userEmail?: string | null
    role?: CanvasRole
    isPublicViewer?: boolean
    canvasTitle?: string
    initialCanvases?: Canvas[]
    initialElements?: CanvasElement[]
    initialScenes?: Scene[]
  }>()

  // svelte-ignore state_referenced_locally -- route usage provides context;
  // this fallback only supports isolated component renders/tests.
  const sceneDocumentsStore = useSceneDocumentsStore({
    canvasId,
    initialItemsBySceneId: {}
  })

  function currentWorkspaceInput() {
    return {
      canvasId,
      userId,
      userEmail,
      role,
      isPublicViewer,
      canvasTitle,
      initialCanvases,
      initialElements,
      initialScenes,
      sceneDocumentsStore
    }
  }

  const workspace = createCanvasWorkspaceStore(currentWorkspaceInput())

  // Provided here (not in wrapper components) because sibling subtrees
  // consume them: the call button in CanvasPresenceActions, the PiP box,
  // and the call's fullscreen view, which embeds the chat panel.
  provideCanvasChatStore({
    getCanvasId: () => workspace.canvasIdForActions,
    getUserId: () => userId,
    getEnabled: () => !workspace.isPublicViewer && Boolean(userId)
  })

  provideCanvasConferenceStore({
    getCanvasId: () => workspace.canvasIdForActions,
    getUserId: () => userId,
    getEnabled: () => !workspace.isPublicViewer && Boolean(userId)
  })

  let rootEl = $state<HTMLDivElement | null>(null)
  let svgEl = $state<SVGSVGElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)

  $effect(() => {
    workspace.setProps(currentWorkspaceInput())
  })

  $effect(() => {
    workspace.setElements({ rootEl, svgEl, textInputEl })
  })

  onMount(workspace.mount)
</script>

<div
  bind:this={rootEl}
  class="relative h-screen w-screen overflow-hidden"
  onpointerdown={workspace.handleViewportPointerDown}
  onpointermove={workspace.handleViewportPointerMove}
  onpointerup={workspace.handleViewportPointerUp}
  onpointercancel={workspace.handleViewportPointerUp}
  onpointerleave={workspace.handleViewportPointerUp}
  ontouchstart={workspace.handleTouchStart}
  ontouchmove={workspace.handleTouchMove}
  ontouchend={workspace.handleTouchEnd}
  style={workspace.rootStyle}
  role="application"
>
  <div class="absolute inset-0 screen-grid"></div>

  <CanvasTitleSwitcher
    canvases={workspace.canvases}
    activeCanvasId={workspace.activeCanvasId}
    currentTitle={workspace.currentCanvasTitle}
    canManageCanvas={workspace.canManageCanvas}
    isLoadingCanvases={workspace.isLoadingCanvases}
    selectedTool={workspace.selectedTool}
    readOnly={!workspace.canEdit || workspace.mode === 'scenes'}
    onTitleSave={workspace.saveTitle}
    onToolChange={workspace.handleToolChange}
  />

  {#if workspace.canEdit}
    <SceneModeSwitcher
      mode={workspace.mode}
      onModeChange={workspace.handleModeChange}
    />
  {/if}

  <CanvasPresenceActions
    canvasId={workspace.canvasIdForActions}
    role={workspace.role}
    members={workspace.displayMembers}
    pendingCount={workspace.pendingRequests.length}
    onShare={workspace.openShareDialog}
  />

  <ShareDialog
    bind:open={workspace.shareDialogOpen}
    canvasId={workspace.canvasIdForActions}
    canvasTitle={workspace.currentCanvasTitle}
    role={workspace.role}
    currentUserId={userId}
    visibility={workspace.currentCanvasVisibility}
    pendingRequests={workspace.pendingRequests}
    onRequestResolved={workspace.handleRequestResolved}
    onVisibilityChange={workspace.saveVisibility}
  />

  <TextFormattingToolbar
    fontSize={workspace.textFormatting.fontSize}
    isBold={workspace.textFormatting.isBold}
    isItalic={workspace.textFormatting.isItalic}
    isUnderline={workspace.textFormatting.isUnderline}
    color={workspace.textFormatting.color}
    listStyle={workspace.activeListStyle}
    isVisible={workspace.selectedTool === 'text'}
    onFontSizeChange={workspace.setTextFontSize}
    onBoldToggle={workspace.toggleTextBold}
    onItalicToggle={workspace.toggleTextItalic}
    onUnderlineToggle={workspace.toggleTextUnderline}
    onColorChange={workspace.setTextColor}
    onListStyleChange={workspace.handleListStyleToggle}
  />

  <DrawingToolbar
    width={workspace.drawFormatting.width}
    color={workspace.drawFormatting.color}
    style={workspace.drawFormatting.style}
    isHighlighter={workspace.drawFormatting.isHighlighter}
    highlighterOpacity={workspace.drawFormatting.highlighterOpacity}
    isVisible={workspace.selectedTool === 'pencil'}
    onWidthChange={workspace.setDrawWidth}
    onColorChange={workspace.setDrawColor}
    onStyleChange={workspace.setDrawStyle}
    onHighlighterToggle={workspace.toggleHighlighter}
    onHighlighterOpacityChange={workspace.setHighlighterOpacity}
  />

  <DiagramToolbar
    formatting={workspace.diagramFormatting}
    selectedTool={workspace.selectedTool}
    selectedCount={workspace.selectedCount}
    hasShapeSelection={workspace.hasShapeSelection}
    hasConnectorSelection={workspace.hasConnectorSelection}
    isVisible={workspace.selectedTool === 'shape' ||
      workspace.selectedTool === 'connector' ||
      workspace.hasShapeSelection ||
      workspace.hasConnectorSelection}
    onShapeKindChange={workspace.setShapeKind}
    onConnectorKindChange={workspace.setConnectorKind}
    onFillColorChange={workspace.setDiagramFillColor}
    onStrokeColorChange={workspace.setDiagramStrokeColor}
    onStrokeWidthChange={workspace.setDiagramStrokeWidth}
    onStrokeStyleChange={workspace.setDiagramStrokeStyle}
    onOpacityChange={workspace.setDiagramOpacity}
    onStartArrowChange={workspace.setDiagramStartArrow}
    onEndArrowChange={workspace.setDiagramEndArrow}
    onArrange={workspace.arrangeSelectedElements}
  />

  {#if workspace.canvasesError || workspace.scenesError}
    <div
      class="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg"
    >
      {workspace.canvasesError ?? workspace.scenesError}
    </div>
  {/if}

  <CanvasSurface
    bind:svgEl
    camera={workspace.camera}
    canEdit={workspace.canEdit}
    selectedTool={workspace.selectedTool}
    drawFormatting={workspace.drawFormatting}
    editingText={workspace.editingText}
    elements={workspace.sceneElements}
    selection={workspace.sceneSelection}
    handlers={workspace.sceneHandlers}
  />

  <SceneCardLayer
    scenes={workspace.scenes}
    camera={workspace.camera}
    mode={workspace.mode}
    canEdit={workspace.canEdit}
    canModifyScene={workspace.canModifyScene}
    activity={workspace.sceneActivity}
    handlers={workspace.sceneCardHandlers}
    isCreatingScene={workspace.isCreatingScene}
    onCreateScene={() => void workspace.createScene('document')}
  />

  <TextEditor
    bind:textInputEl
    camera={workspace.camera}
    editingText={workspace.editingText}
    textFormatting={workspace.textFormatting}
    onValueChange={workspace.applyEditorValue}
    onBlur={workspace.handleTextInputBlur}
    onKeydown={workspace.handleTextEditorKeydown}
    onSelectionChange={workspace.syncEditorSelection}
  />

  <LiveCursors cursors={workspace.cursors} camera={workspace.camera} />

  {#if workspace.canEdit && workspace.mode === 'editor'}
    <CanvasActionToolbar
      selectedCount={workspace.selectedCount}
      canUndo={workspace.canUndo}
      canRedo={workspace.canRedo}
      onDelete={workspace.deleteSelectedElements}
      onUndo={workspace.handleUndo}
      onRedo={workspace.handleRedo}
    />
  {/if}

  <CanvasZoomControls
    camera={workspace.camera}
    onZoomIn={workspace.zoomIn}
    onZoomOut={workspace.zoomOut}
    onReset={workspace.resetView}
  />

  <!-- Chat is members-only: public read-only viewers don't get the
       launcher (matching the API and RLS gates). -->
  {#if !workspace.isPublicViewer && userId}
    <CanvasChat canvasId={workspace.canvasIdForActions} {userId} />
  {/if}

  <!-- Calls are members-only too; the conference store self-gates all
       network traffic via getEnabled. -->
  <CanvasConference />

  {#if workspace.isPublicViewer || workspace.role === 'reader'}
    <RequestEditAccessBanner
      canvasId={workspace.canvasIdForActions}
      isPublicViewer={workspace.isPublicViewer}
    />
  {/if}

  {#if workspace.openScene}
    {@const open = workspace.openScene}
    {#key open.scene.id}
      <SceneDialog
        canvasId={workspace.canvasIdForActions}
        scene={open.scene}
        {userId}
        originRect={open.originRect}
        canModify={workspace.canModifyScene(open.scene.id)}
        documentRevision={workspace.sceneDocumentRevisions[open.scene.id] ?? 0}
        liveMessages={workspace.sceneLiveMessages[open.scene.id] ?? []}
        remoteActivity={workspace.sceneActivity[open.scene.id] ?? null}
        remoteStreamingText={workspace.sceneStreamingText[open.scene.id] ?? ''}
        onClose={workspace.closeOpenScene}
        onPatchScene={(patch) => workspace.patchScene(open.scene.id, patch)}
        onDeleteScene={() => void workspace.deleteScene(open.scene.id)}
        onBroadcastActivity={(kind, textDelta) =>
          workspace.broadcastSceneActivity(open.scene.id, kind, textDelta)}
      />
    {/key}
  {/if}
</div>
