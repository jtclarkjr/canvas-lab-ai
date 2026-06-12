<script lang="ts">
  import {
    Download,
    Eraser,
    Highlighter,
    MousePointer2,
    Pencil,
    Redo2,
    Trash2,
    Type,
    Undo2
  } from 'lucide-svelte'
  import type { Tool } from '$lib/canvas/types'

  let {
    selectedTool,
    onToolChange,
    drawColor,
    onColorChange,
    drawWidth,
    onWidthChange,
    isHighlighter,
    onHighlighterToggle,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedCount,
    onDeleteSelected,
    saveLabel,
    readOnly,
    onExportPdf
  } = $props<{
    selectedTool: Tool
    onToolChange: (tool: Tool) => void
    drawColor: string
    onColorChange: (color: string) => void
    drawWidth: number
    onWidthChange: (width: number) => void
    isHighlighter: boolean
    onHighlighterToggle: () => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
    selectedCount: number
    onDeleteSelected: () => void
    saveLabel: string | null
    readOnly: boolean
    onExportPdf: () => void
  }>()

  const tools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
    { id: 'text' as Tool, icon: Type, label: 'Text' }
  ]

  const colors = ['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea']
  const widths = [2, 4, 8]
</script>

<div class="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-2">
  {#if !readOnly}
    <div class="flex items-center gap-0.5 rounded-full border border-border/60 p-0.5">
      {#each tools as tool (tool.id)}
        <button
          type="button"
          class={`flex size-8 items-center justify-center rounded-full transition ${
            selectedTool === tool.id
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onclick={() => onToolChange(tool.id)}
          title={tool.label}
        >
          <tool.icon class="size-4" />
        </button>
      {/each}
    </div>

    <div class="flex items-center gap-1">
      {#each colors as color (color)}
        <button
          type="button"
          class={`size-5 rounded-full border-2 transition ${
            drawColor === color ? 'scale-110 border-primary' : 'border-transparent'
          }`}
          style={`background:${color}`}
          onclick={() => onColorChange(color)}
          title="Set color"
          aria-label={`Set color ${color}`}
        ></button>
      {/each}
    </div>

    <div class="flex items-center gap-0.5">
      {#each widths as width (width)}
        <button
          type="button"
          class={`flex size-8 items-center justify-center rounded-full transition ${
            drawWidth === width
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          onclick={() => onWidthChange(width)}
          title={`Stroke width ${width}`}
        >
          <span class="rounded-full bg-current" style={`width:${width + 4}px;height:${width + 4}px`}
          ></span>
        </button>
      {/each}
    </div>

    <button
      type="button"
      class={`flex size-8 items-center justify-center rounded-full transition ${
        isHighlighter ? 'bg-amber-400/30 text-amber-600' : 'text-muted-foreground hover:bg-muted'
      }`}
      onclick={onHighlighterToggle}
      title="Highlighter"
      aria-pressed={isHighlighter}
    >
      <Highlighter class="size-4" />
    </button>

    <div class="flex items-center gap-0.5">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
        onclick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        <Undo2 class="size-4" />
      </button>
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
        onclick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        <Redo2 class="size-4" />
      </button>
      {#if selectedCount > 0}
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
          onclick={onDeleteSelected}
          title={`Delete ${selectedCount} selected`}
        >
          <Trash2 class="size-4" />
        </button>
      {/if}
    </div>
  {/if}

  <div class="ml-auto flex items-center gap-2">
    {#if saveLabel}
      <span class="text-xs text-muted-foreground">{saveLabel}</span>
    {/if}
    <button
      type="button"
      class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
      onclick={onExportPdf}
      title="Download as PDF"
    >
      <Download class="size-3.5" />
      PDF
    </button>
  </div>
</div>
