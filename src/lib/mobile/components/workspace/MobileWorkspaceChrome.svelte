<script lang="ts">
  import type { CanvasWorkspaceStore } from '$lib/mobile/types'
  import MobileActionToolbar from '$lib/mobile/components/toolbars/MobileActionToolbar.svelte'
  import MobileDiagramToolbar from '$lib/mobile/components/toolbars/MobileDiagramToolbar.svelte'
  import MobileDrawingToolbar from '$lib/mobile/components/toolbars/MobileDrawingToolbar.svelte'
  import MobileTextFormattingToolbar from '$lib/mobile/components/toolbars/MobileTextFormattingToolbar.svelte'
  import MobileToolDock from '$lib/mobile/components/toolbars/MobileToolDock.svelte'
  import MobileTopMenu from '$lib/mobile/components/navigation/MobileTopMenu.svelte'

  let { workspace } = $props<{
    workspace: CanvasWorkspaceStore
  }>()
</script>

<MobileTopMenu
  canvases={workspace.canvases}
  activeCanvasId={workspace.activeCanvasId}
  currentTitle={workspace.currentCanvasTitle}
  canManageCanvas={workspace.canManageCanvas}
  isLoadingCanvases={workspace.isLoadingCanvases}
  showNavigation={!workspace.isAnonymousPublicViewer}
  canvasId={workspace.canvasIdForActions}
  pendingCount={workspace.pendingRequests.length}
  onTitleSave={workspace.saveTitle}
  onShare={workspace.openShareDialog}
/>

<MobileToolDock
  selectedTool={workspace.displayTool}
  readOnly={!workspace.canEdit || workspace.mode === 'scenes'}
  onToolChange={workspace.handleToolChange}
/>

<MobileTextFormattingToolbar
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

<MobileDrawingToolbar
  width={workspace.drawFormatting.width}
  color={workspace.drawFormatting.color}
  style={workspace.drawFormatting.style}
  isHighlighter={workspace.drawFormatting.isHighlighter}
  highlighterOpacity={workspace.drawFormatting.highlighterOpacity}
  isVisible={workspace.selectedTool === 'pencil' || workspace.hasPathSelection}
  onWidthChange={workspace.setDrawWidth}
  onColorChange={workspace.setDrawColor}
  onStyleChange={workspace.setDrawStyle}
  onHighlighterToggle={workspace.toggleHighlighter}
  onHighlighterOpacityChange={workspace.setHighlighterOpacity}
/>

<MobileDiagramToolbar
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
  onTemplateInsert={workspace.insertDiagramTemplate}
  onArrange={workspace.arrangeSelectedElements}
/>

{#if workspace.canEdit && workspace.mode === 'editor'}
  <MobileActionToolbar
    selectedCount={workspace.selectedCount}
    canUndo={workspace.canUndo}
    canRedo={workspace.canRedo}
    onDelete={workspace.deleteSelectedElements}
    onUndo={workspace.handleUndo}
    onRedo={workspace.handleRedo}
  />
{/if}
