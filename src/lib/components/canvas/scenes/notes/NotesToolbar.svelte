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
  import { Button, IconButton } from '$lib/components/ui'

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

  const colors = [
    '#0f172a',
    '#dc2626',
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#9333ea'
  ]
  const widths = [2, 4, 8]
</script>

<div
  class="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-2"
>
  {#if !readOnly}
    <div
      class="flex items-center gap-0.5 rounded-full border border-border/60 p-0.5"
    >
      {#each tools as tool (tool.id)}
        <IconButton
          label={tool.label}
          variant="ghost"
          class={`flex size-8 items-center justify-center rounded-full transition ${
            selectedTool === tool.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onclick={() => onToolChange(tool.id)}
          aria-pressed={selectedTool === tool.id}
        >
          <tool.icon class="size-4" aria-hidden="true" />
        </IconButton>
      {/each}
    </div>

    <div class="flex items-center gap-1">
      {#each colors as color (color)}
        <button
          type="button"
          class={`size-5 rounded-full border-2 transition ${
            drawColor === color
              ? 'scale-110 border-primary'
              : 'border-transparent'
          }`}
          style={`background:${color}`}
          onclick={() => onColorChange(color)}
          aria-label={`Set color ${color}`}
          aria-pressed={drawColor === color}
        ></button>
      {/each}
    </div>

    <div class="flex items-center gap-0.5">
      {#each widths as width (width)}
        <IconButton
          label={`Stroke width ${width}`}
          variant="ghost"
          class={`flex size-8 items-center justify-center rounded-full transition ${
            drawWidth === width
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
          onclick={() => onWidthChange(width)}
          aria-pressed={drawWidth === width}
        >
          <span
            class="rounded-full bg-current"
            style={`width:${width + 4}px;height:${width + 4}px`}
            aria-hidden="true"
          ></span>
        </IconButton>
      {/each}
    </div>

    <IconButton
      label="Highlighter"
      variant="ghost"
      class={`flex size-8 items-center justify-center rounded-full transition ${
        isHighlighter
          ? 'bg-warning/20 text-amber-700 dark:text-amber-300'
          : 'text-muted-foreground hover:bg-muted'
      }`}
      onclick={onHighlighterToggle}
      aria-pressed={isHighlighter}
    >
      <Highlighter class="size-4" aria-hidden="true" />
    </IconButton>

    <div class="flex items-center gap-0.5">
      <IconButton
        label="Undo"
        variant="ghost"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
        onclick={onUndo}
        disabled={!canUndo}
      >
        <Undo2 class="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        label="Redo"
        variant="ghost"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
        onclick={onRedo}
        disabled={!canRedo}
      >
        <Redo2 class="size-4" aria-hidden="true" />
      </IconButton>
      {#if selectedCount > 0}
        <IconButton
          label={`Delete ${selectedCount} selected`}
          variant="ghost"
          class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          onclick={onDeleteSelected}
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </IconButton>
      {/if}
    </div>
  {/if}

  <div class="ml-auto flex items-center gap-2">
    {#if saveLabel}
      <span class="text-xs text-muted-foreground">{saveLabel}</span>
    {/if}
    <Button
      variant="outline"
      size="sm"
      class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
      onclick={onExportPdf}
      aria-label="Download as PDF"
    >
      <Download class="size-3.5" aria-hidden="true" />
      PDF
    </Button>
  </div>
</div>
