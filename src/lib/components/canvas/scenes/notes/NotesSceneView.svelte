<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { markdownDocumentContentSchema, type SceneDocument } from '$lib/scenes/schema'
  import type { SceneActivityKind } from '$lib/scenes/types'
  import { renderMarkdown } from '$lib/scenes/markdown'
  import { exportAnnotatedNotesPdf } from '$lib/scenes/notes-pdf'
  import { createNotesSceneStore } from '$lib/stores/canvas/scenes/notes.svelte'
  import CanvasScene from '$lib/components/canvas/CanvasScene.svelte'
  import CanvasTextEditor from '$lib/components/canvas/CanvasTextEditor.svelte'
  import NotesToolbar from '$lib/components/canvas/scenes/notes/NotesToolbar.svelte'

  let {
    canvasId,
    sceneId,
    document: sceneDocument,
    userId,
    canModify,
    onBroadcastActivity
  } = $props<{
    canvasId: string
    sceneId: string
    document: SceneDocument
    userId: string
    canModify: boolean
    onBroadcastActivity: (kind: SceneActivityKind, textDelta?: string) => void
  }>()

  let svgEl = $state<SVGSVGElement | null>(null)
  let textInputEl = $state<HTMLTextAreaElement | null>(null)
  let contentEl = $state<HTMLDivElement | null>(null)
  let exportError = $state<string | null>(null)

  // svelte-ignore state_referenced_locally -- the view is keyed by document
  // id, so canvasId/sceneId/document.id are stable for its lifetime
  const notes = createNotesSceneStore({
    canvasId,
    sceneId,
    documentId: sceneDocument.id,
    getUserId: () => userId,
    canModify: () => canModify,
    onActivity: (kind) => onBroadcastActivity(kind)
  })

  const renderedHtml = $derived.by(() => {
    const parsed = markdownDocumentContentSchema.safeParse(sceneDocument.content)
    return renderMarkdown(parsed.success ? parsed.data.markdown : '')
  })

  $effect(() => {
    notes.setElements({ svgEl, textInputEl })
  })

  // Seed the annotation layer, and refresh it when the document updates
  // remotely (the store skips refreshes while there is unsaved local work).
  // untrack: this must only re-run when the content prop changes — without
  // it the effect also tracks the store's dirty/drawing flags and re-fires
  // after every save, resetting the layer from a stale prop.
  $effect(() => {
    const content = sceneDocument.content
    untrack(() => notes.applyAnnotations(content))
  })

  onMount(() => {
    const handleVisibilityChange = () => {
      if (window.document.visibilityState === 'hidden') {
        notes.flush()
      }
    }
    window.document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.document.removeEventListener('visibilitychange', handleVisibilityChange)
      notes.flush()
    }
  })

  const saveLabel = $derived.by(() => {
    if (notes.isSaving) return 'Saving…'
    if (notes.isDirty) return 'Unsaved notes'
    return null
  })

  function handleExportPdf() {
    if (!svgEl || !contentEl) {
      return
    }
    void exportAnnotatedNotesPdf({
      annotationsSvg: svgEl,
      contentEl,
      title: sceneDocument.title || 'notes'
    }).catch(() => {
      exportError = 'Failed to export the PDF.'
    })
  }
</script>

<div class="flex h-full min-h-0 flex-col">
  <NotesToolbar
    selectedTool={notes.selectedTool}
    onToolChange={notes.handleToolChange}
    drawColor={notes.drawFormatting.color}
    onColorChange={notes.setDrawColor}
    drawWidth={notes.drawFormatting.width}
    onWidthChange={notes.setDrawWidth}
    isHighlighter={notes.drawFormatting.isHighlighter}
    onHighlighterToggle={notes.toggleHighlighter}
    canUndo={notes.canUndo}
    canRedo={notes.canRedo}
    onUndo={notes.handleUndo}
    onRedo={notes.handleRedo}
    selectedCount={notes.selectedCount}
    onDeleteSelected={notes.deleteSelectedElements}
    {saveLabel}
    readOnly={!canModify}
    onExportPdf={handleExportPdf}
  />

  {#if notes.error || exportError}
    <div class="mx-4 mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600">
      {notes.error ?? exportError}
    </div>
  {/if}

  <!-- The rendered document is the annotation surface: prose below, a
       transparent drawing layer on top, both inside one scroll container
       so the annotations stay anchored to the text while scrolling. -->
  <div class="min-h-0 flex-1 overflow-y-auto bg-white">
    <div bind:this={contentEl} class="relative min-h-full">
      <div class="notes-prose">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized via DOMPurify in renderMarkdown -->
        {@html renderedHtml}
      </div>

      <CanvasScene
        bind:svgEl
        camera={notes.camera}
        canEdit={canModify}
        selectedTool={notes.selectedTool}
        drawFormatting={notes.drawFormatting}
        editingText={notes.editingText}
        elements={notes.sceneElements}
        selection={notes.sceneSelection}
        handlers={notes.sceneHandlers}
      />

      <CanvasTextEditor
        bind:textInputEl
        camera={notes.camera}
        editingText={notes.editingText}
        textFormatting={notes.textFormatting}
        onValueChange={notes.applyEditorValue}
        onBlur={notes.handleTextInputBlur}
        onKeydown={notes.handleTextEditorKeydown}
        onSelectionChange={notes.syncEditorSelection}
      />
    </div>
  </div>
</div>

<style>
  /* Self-contained prose styles with explicit hex colors: the injected
     markdown must not inherit theme variables (html2canvas, used by the
     PDF export, cannot parse oklch() values). */
  .notes-prose {
    padding: 2rem;
    font-size: 0.9375rem;
    line-height: 1.65;
    color: #0f172a;
    word-wrap: break-word;
  }

  .notes-prose :global(h1) {
    margin: 0 0 0.75rem;
    font-size: 1.6rem;
    font-weight: 700;
  }

  .notes-prose :global(h2) {
    margin: 1.5rem 0 0.5rem;
    font-size: 1.3rem;
    font-weight: 700;
  }

  .notes-prose :global(h3) {
    margin: 1.25rem 0 0.5rem;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .notes-prose :global(h4),
  .notes-prose :global(h5),
  .notes-prose :global(h6) {
    margin: 1rem 0 0.5rem;
    font-size: 1rem;
    font-weight: 600;
  }

  .notes-prose :global(p) {
    margin: 0 0 0.75rem;
  }

  .notes-prose :global(ul),
  .notes-prose :global(ol) {
    margin: 0 0 0.75rem;
    padding-left: 1.5rem;
  }

  .notes-prose :global(ul) {
    list-style: disc;
  }

  .notes-prose :global(ol) {
    list-style: decimal;
  }

  .notes-prose :global(li) {
    margin: 0.2rem 0;
  }

  .notes-prose :global(code) {
    border-radius: 4px;
    background: #f1f5f9;
    padding: 0.1rem 0.35rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85em;
    color: #0f172a;
  }

  .notes-prose :global(pre) {
    margin: 0 0 0.75rem;
    overflow-x: auto;
    border-radius: 8px;
    background: #f1f5f9;
    padding: 0.75rem 1rem;
  }

  .notes-prose :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .notes-prose :global(blockquote) {
    margin: 0 0 0.75rem;
    border-left: 3px solid #cbd5e1;
    padding-left: 0.75rem;
    color: #475569;
  }

  .notes-prose :global(a) {
    color: #2563eb;
    text-decoration: underline;
  }

  .notes-prose :global(hr) {
    margin: 1.25rem 0;
    border: 0;
    border-top: 1px solid #e2e8f0;
  }

  .notes-prose :global(table) {
    margin: 0 0 0.75rem;
    border-collapse: collapse;
  }

  .notes-prose :global(th),
  .notes-prose :global(td) {
    border: 1px solid #e2e8f0;
    padding: 0.3rem 0.6rem;
    text-align: left;
  }

  .notes-prose :global(img) {
    max-width: 100%;
  }
</style>
