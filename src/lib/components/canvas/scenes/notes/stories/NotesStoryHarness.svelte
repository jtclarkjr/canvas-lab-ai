<script lang="ts">
  import NotesSceneView from '../NotesSceneView.svelte'
  import NotesToolbar from '../NotesToolbar.svelte'
  import type { Tool } from '$lib/canvas/types'
  import { draftDocument } from '../../document/stories/fixtures'

  let { target } = $props<{ target: 'toolbar' | 'view' }>()

  let selectedTool = $state<Tool>('select')
  let drawColor = $state('#0f172a')
  let drawWidth = $state(4)
  let highlighter = $state(false)
  let result = $state('')
</script>

<div class="min-h-[40rem] bg-background p-6 text-foreground">
  {#if target === 'toolbar'}
    <div class="rounded-2xl border border-border/60 bg-card">
      <NotesToolbar
        {selectedTool}
        onToolChange={(tool) => {
          selectedTool = tool
          result = tool
        }}
        {drawColor}
        onColorChange={(color) => (drawColor = color)}
        {drawWidth}
        onWidthChange={(width) => (drawWidth = width)}
        isHighlighter={highlighter}
        onHighlighterToggle={() => (highlighter = !highlighter)}
        canUndo
        canRedo={false}
        onUndo={() => (result = 'undo')}
        onRedo={() => (result = 'redo')}
        selectedCount={1}
        onDeleteSelected={() => (result = 'delete')}
        saveLabel="Saved"
        readOnly={false}
        onExportPdf={() => (result = 'pdf')}
      />
    </div>
  {:else}
    <div
      class="h-[36rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <NotesSceneView
        canvasId="canvas-notes-story"
        sceneId="scene-notes-story"
        document={draftDocument}
        userId="user-james"
        canModify
        onBroadcastActivity={() => undefined}
      />
    </div>
  {/if}

  <output class="sr-only" data-testid="notes-result">{result}</output>
</div>
