<script lang="ts">
  import CallSessionsDrawer from '../CallSessionsDrawer.svelte'
  import CanvasHistoryButton from '../CanvasHistoryButton.svelte'
  import CanvasHistoryDrawer from '../CanvasHistoryDrawer.svelte'
  import CanvasOptionsButton from '../CanvasOptionsButton.svelte'
  import CanvasPresenceActions from '../CanvasPresenceActions.svelte'
  import CanvasTitleSwitcher from '../CanvasTitleSwitcher.svelte'
  import CanvasToolbar from '../CanvasToolbar.svelte'
  import CanvasWorkspace from '../CanvasWorkspace.svelte'
  import CanvasZoomControls from '../CanvasZoomControls.svelte'
  import DiagramTemplateMenu from '../DiagramTemplateMenu.svelte'
  import LiveCursors from '../LiveCursors.svelte'
  import RequestEditAccessBanner from '../RequestEditAccessBanner.svelte'
  import ShareDialog from '../ShareDialog.svelte'
  import CanvasActionToolbar from '../toolbars/CanvasActionToolbar.svelte'
  import DiagramToolbar from '../toolbars/DiagramToolbar.svelte'
  import DrawingToolbar from '../toolbars/DrawingToolbar.svelte'
  import TextFormattingToolbar from '../toolbars/TextFormattingToolbar.svelte'
  import MobileTopMenu from '$lib/mobile/components/navigation/MobileTopMenu.svelte'
  import MobileShareDialog from '$lib/mobile/components/share/MobileShareDialog.svelte'
  import MobileActionToolbar from '$lib/mobile/components/toolbars/MobileActionToolbar.svelte'
  import MobileDiagramToolbar from '$lib/mobile/components/toolbars/MobileDiagramToolbar.svelte'
  import MobileDrawingToolbar from '$lib/mobile/components/toolbars/MobileDrawingToolbar.svelte'
  import MobileTextFormattingToolbar from '$lib/mobile/components/toolbars/MobileTextFormattingToolbar.svelte'
  import MobileToolDock from '$lib/mobile/components/toolbars/MobileToolDock.svelte'
  import {
    createCanvasConferenceStore,
    provideCanvasConferenceStoreInstance
  } from '$lib/stores/conference/index.svelte'
  import type { Canvas } from '$lib/canvas/schema'
  import type { DiagramFormatting, Tool } from '$lib/canvas/types'
  import type { DisplayMember } from '$lib/workspace/types'

  type Target =
    | 'call-sessions'
    | 'history-button'
    | 'history-drawer'
    | 'options-button'
    | 'presence-actions'
    | 'title-switcher'
    | 'toolbar'
    | 'workspace'
    | 'zoom-controls'
    | 'template-menu'
    | 'live-cursors'
    | 'request-access'
    | 'share-dialog'
    | 'action-toolbar'
    | 'diagram-toolbar'
    | 'drawing-toolbar'
    | 'text-toolbar'
    | 'mobile-top-menu'
    | 'mobile-share-dialog'
    | 'mobile-action-toolbar'
    | 'mobile-diagram-toolbar'
    | 'mobile-drawing-toolbar'
    | 'mobile-text-toolbar'
    | 'mobile-tool-dock'

  let { target } = $props<{ target: Target }>()

  const canvasId = 'canvas-story'
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
    },
    {
      id: 'canvas-secondary',
      title: 'Launch planning',
      createdBy: userId,
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
      visibility: 'private',
      iconPath: null,
      iconUrl: null,
      role: 'editor'
    }
  ]
  const members: DisplayMember[] = [
    { id: userId, name: 'Alex Morgan', color: '#bfdbfe' },
    { id: 'user-riley', name: 'Riley Chen', color: '#ddd6fe' },
    {
      id: 'guest-story',
      name: 'Guest viewer',
      color: '#a7f3d0',
      isAnonymous: true
    }
  ]

  let result = $state('')
  let selectedTool = $state<Tool>('select')
  let followedUserId = $state<string | null>('user-riley')
  let diagramFormatting = $state<DiagramFormatting>({
    shapeKind: 'rectangle',
    connectorKind: 'straight',
    fillColor: '#dbeafe',
    strokeColor: '#2563eb',
    strokeWidth: 2,
    strokeStyle: 'solid',
    opacity: 1,
    startArrow: 'none',
    endArrow: 'arrow'
  })
  let drawWidth = $state(4)
  let drawColor = $state('#2563eb')
  let drawStyle = $state<'freeform' | 'straight'>('freeform')
  let highlighter = $state(false)
  let fontSize = $state(18)
  let bold = $state(true)
  let italic = $state(false)
  let underline = $state(false)

  provideCanvasConferenceStoreInstance(
    createCanvasConferenceStore({
      getCanvasId: () => canvasId,
      getUserId: () => userId,
      getEnabled: () => true
    })
  )
</script>

<div
  class="relative min-h-[46rem] overflow-hidden bg-background p-6 text-foreground"
>
  {#if target === 'call-sessions'}
    <CallSessionsDrawer open {canvasId} />
  {:else if target === 'history-button'}
    <CanvasHistoryButton {canvasId} />
  {:else if target === 'history-drawer'}
    <CanvasHistoryDrawer open {canvasId} />
  {:else if target === 'options-button'}
    <CanvasOptionsButton
      {canvasId}
      role="owner"
      pendingCount={2}
      onShare={() => (result = 'share')}
      onOpenCallSessions={() => (result = 'sessions')}
    />
  {:else if target === 'presence-actions'}
    <CanvasPresenceActions
      {canvasId}
      role="owner"
      {members}
      currentUserId={userId}
      {followedUserId}
      pendingCount={2}
      onShare={() => (result = 'share')}
      onOpenCallSessions={() => (result = 'sessions')}
      onFollowMember={(id) => {
        followedUserId = id
        result = id ?? 'unfollow'
      }}
    />
  {:else if target === 'title-switcher'}
    <CanvasTitleSwitcher
      {canvases}
      activeCanvasId={canvasId}
      currentTitle="Research canvas"
      canManageCanvas
      isLoadingCanvases={false}
      {selectedTool}
      readOnly={false}
      onToolChange={(tool) => {
        selectedTool = tool
        result = tool
      }}
      onTitleSave={(title) => {
        result = title
      }}
    />
  {:else if target === 'toolbar'}
    <CanvasToolbar
      {selectedTool}
      onToolChange={(tool) => {
        selectedTool = tool
        result = tool
      }}
    />
  {:else if target === 'workspace'}
    <CanvasWorkspace
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
    />
  {:else if target === 'zoom-controls'}
    <CanvasZoomControls
      camera={{ x: 0, y: 0, scale: 0.8 }}
      onZoomIn={() => (result = 'zoom-in')}
      onZoomOut={() => (result = 'zoom-out')}
      onReset={() => (result = 'reset')}
    />
  {:else if target === 'template-menu'}
    <div
      class="max-w-sm rounded-2xl border border-border bg-popover p-2 shadow-xl"
    >
      <DiagramTemplateMenu
        onTemplateInsert={(id) => (result = id)}
        onClose={() => undefined}
      />
    </div>
  {:else if target === 'live-cursors'}
    <LiveCursors
      camera={{ x: 20, y: 30, scale: 1 }}
      cursors={{
        riley: {
          position: { x: 180, y: 130 },
          coordinateSpace: 'canvas',
          user: { id: 'user-riley', name: 'Riley Chen' },
          color: '#ddd6fe',
          timestamp: Date.now()
        }
      }}
    />
  {:else if target === 'request-access'}
    <RequestEditAccessBanner
      {canvasId}
      isPublicViewer
      isAnonymousPublicViewer
    />
  {:else if target === 'share-dialog'}
    <ShareDialog
      open
      {canvasId}
      canvasTitle="Research canvas"
      role="owner"
      currentUserId={userId}
      pendingRequests={[]}
    />
  {:else if target === 'action-toolbar'}
    <CanvasActionToolbar
      selectedCount={2}
      canUndo
      canRedo
      onDelete={() => (result = 'delete')}
      onUndo={() => (result = 'undo')}
      onRedo={() => (result = 'redo')}
    />
  {:else if target === 'diagram-toolbar'}
    <DiagramToolbar
      formatting={diagramFormatting}
      selectedTool="shape"
      selectedCount={2}
      hasShapeSelection
      hasConnectorSelection={false}
      isVisible
      onShapeKindChange={(shapeKind) =>
        (diagramFormatting = { ...diagramFormatting, shapeKind })}
      onConnectorKindChange={(connectorKind) =>
        (diagramFormatting = { ...diagramFormatting, connectorKind })}
      onFillColorChange={(fillColor) =>
        (diagramFormatting = { ...diagramFormatting, fillColor })}
      onStrokeColorChange={(strokeColor) =>
        (diagramFormatting = { ...diagramFormatting, strokeColor })}
      onStrokeWidthChange={(strokeWidth) =>
        (diagramFormatting = { ...diagramFormatting, strokeWidth })}
      onStrokeStyleChange={(strokeStyle) =>
        (diagramFormatting = { ...diagramFormatting, strokeStyle })}
      onOpacityChange={(opacity) =>
        (diagramFormatting = { ...diagramFormatting, opacity })}
      onStartArrowChange={(startArrow) =>
        (diagramFormatting = { ...diagramFormatting, startArrow })}
      onEndArrowChange={(endArrow) =>
        (diagramFormatting = { ...diagramFormatting, endArrow })}
      onTemplateInsert={(id) => (result = id)}
      onArrange={(action) => (result = action)}
    />
  {:else if target === 'drawing-toolbar'}
    <DrawingToolbar
      width={drawWidth}
      color={drawColor}
      style={drawStyle}
      isHighlighter={highlighter}
      highlighterOpacity={0.35}
      isVisible
      onWidthChange={(value) => (drawWidth = value)}
      onColorChange={(value) => (drawColor = value)}
      onStyleChange={(value) => (drawStyle = value)}
      onHighlighterToggle={() => (highlighter = !highlighter)}
      onHighlighterOpacityChange={() => undefined}
    />
  {:else if target === 'text-toolbar'}
    <TextFormattingToolbar
      {fontSize}
      isBold={bold}
      isItalic={italic}
      isUnderline={underline}
      color="#172033"
      listStyle="bullet"
      isVisible
      onFontSizeChange={(value) => (fontSize = value)}
      onBoldToggle={() => (bold = !bold)}
      onItalicToggle={() => (italic = !italic)}
      onUnderlineToggle={() => (underline = !underline)}
      onColorChange={() => undefined}
      onListStyleChange={() => undefined}
    />
  {:else if target === 'mobile-top-menu'}
    <MobileTopMenu
      {canvases}
      activeCanvasId={canvasId}
      currentTitle="Research canvas"
      canManageCanvas
      isLoadingCanvases={false}
      {canvasId}
      mode="editor"
      workflowEnabled
      pendingCount={2}
      onShare={() => (result = 'share')}
      onTitleSave={(title) => {
        result = title
      }}
      onModeChange={(mode) => (result = mode)}
    />
  {:else if target === 'mobile-share-dialog'}
    <MobileShareDialog
      open
      {canvasId}
      canvasTitle="Research canvas"
      role="owner"
      currentUserId={userId}
      pendingRequests={[]}
    />
  {:else if target === 'mobile-action-toolbar'}
    <MobileActionToolbar
      selectedCount={2}
      canUndo
      canRedo
      onDelete={() => (result = 'delete')}
      onUndo={() => (result = 'undo')}
      onRedo={() => (result = 'redo')}
    />
  {:else if target === 'mobile-diagram-toolbar'}
    <MobileDiagramToolbar
      formatting={diagramFormatting}
      selectedTool="shape"
      selectedCount={2}
      hasShapeSelection
      hasConnectorSelection={false}
      isVisible
      onShapeKindChange={(shapeKind) =>
        (diagramFormatting = { ...diagramFormatting, shapeKind })}
      onConnectorKindChange={(connectorKind) =>
        (diagramFormatting = { ...diagramFormatting, connectorKind })}
      onFillColorChange={(fillColor) =>
        (diagramFormatting = { ...diagramFormatting, fillColor })}
      onStrokeColorChange={(strokeColor) =>
        (diagramFormatting = { ...diagramFormatting, strokeColor })}
      onStrokeWidthChange={(strokeWidth) =>
        (diagramFormatting = { ...diagramFormatting, strokeWidth })}
      onStrokeStyleChange={(strokeStyle) =>
        (diagramFormatting = { ...diagramFormatting, strokeStyle })}
      onOpacityChange={(opacity) =>
        (diagramFormatting = { ...diagramFormatting, opacity })}
      onStartArrowChange={(startArrow) =>
        (diagramFormatting = { ...diagramFormatting, startArrow })}
      onEndArrowChange={(endArrow) =>
        (diagramFormatting = { ...diagramFormatting, endArrow })}
      onTemplateInsert={(id) => (result = id)}
      onArrange={(action) => (result = action)}
    />
  {:else if target === 'mobile-drawing-toolbar'}
    <MobileDrawingToolbar
      width={drawWidth}
      color={drawColor}
      style={drawStyle}
      isHighlighter={highlighter}
      highlighterOpacity={0.35}
      isVisible
      onWidthChange={(value) => (drawWidth = value)}
      onColorChange={(value) => (drawColor = value)}
      onStyleChange={(value) => (drawStyle = value)}
      onHighlighterToggle={() => (highlighter = !highlighter)}
      onHighlighterOpacityChange={() => undefined}
    />
  {:else if target === 'mobile-text-toolbar'}
    <MobileTextFormattingToolbar
      {fontSize}
      isBold={bold}
      isItalic={italic}
      isUnderline={underline}
      color="#172033"
      listStyle="bullet"
      isVisible
      onFontSizeChange={(value) => (fontSize = value)}
      onBoldToggle={() => (bold = !bold)}
      onItalicToggle={() => (italic = !italic)}
      onUnderlineToggle={() => (underline = !underline)}
      onColorChange={() => undefined}
      onListStyleChange={() => undefined}
    />
  {:else if target === 'mobile-tool-dock'}
    <MobileToolDock
      {selectedTool}
      onToolChange={(tool) => {
        selectedTool = tool
        result = tool
      }}
    />
  {/if}

  <output class="sr-only" data-testid="workspace-result">{result}</output>
</div>
