<script lang="ts">
  import {
    ArrowRight,
    Eraser,
    Hand,
    MousePointer2,
    Pencil,
    Square,
    Type
  } from 'lucide-svelte'
  import type { Tool } from '$lib/canvas/types'

  let {
    selectedTool,
    onToolChange,
    readOnly = false
  } = $props<{
    selectedTool: Tool
    onToolChange: (tool: Tool) => void
    readOnly?: boolean
  }>()

  const allTools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Pointer' },
    { id: 'hand' as Tool, icon: Hand, label: 'Hand' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil' },
    { id: 'shape' as Tool, icon: Square, label: 'Shape' },
    { id: 'connector' as Tool, icon: ArrowRight, label: 'Connector' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
    { id: 'text' as Tool, icon: Type, label: 'Text' }
  ]

  const tools = $derived(
    readOnly ? allTools.filter((tool) => tool.id === 'hand') : allTools
  )
</script>

<div
  class="pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30"
  data-camera-exempt
>
  <div
    class="toolbar-pill flex w-full items-center justify-between gap-0.5 p-1"
    role="toolbar"
    aria-label="Drawing tools"
  >
    {#each tools as tool}
      <button
        type="button"
        class={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-full transition ${
          selectedTool === tool.id
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground'
        }`}
        onclick={() => onToolChange(tool.id)}
        aria-label={tool.label}
        aria-pressed={selectedTool === tool.id}
      >
        <tool.icon class="size-4" aria-hidden="true" />
      </button>
    {/each}
  </div>
</div>
