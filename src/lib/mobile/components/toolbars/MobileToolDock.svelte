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

  const activeIndex = $derived(
    Math.max(
      0,
      tools.findIndex((tool) => tool.id === selectedTool)
    )
  )
  const dockStyle = $derived(
    [
      `--mobile-tool-width:${100 / tools.length}%`,
      `--mobile-tool-offset:${activeIndex * 100}%`
    ].join(';')
  )
</script>

<div
  class="pointer-events-auto fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30"
  data-camera-exempt
>
  <div
    class="mobile-tool-dock toolbar-pill relative flex w-full items-center justify-between gap-0.5 overflow-hidden p-1"
    style={dockStyle}
    role="toolbar"
    aria-label="Drawing tools"
  >
    <span
      class="pointer-events-none absolute inset-y-1 left-1 right-1"
      aria-hidden="true"
    >
      <span
        class="mobile-tool-dock__thumb block h-full rounded-full bg-primary shadow-sm"
      ></span>
    </span>
    {#each tools as tool}
      <button
        type="button"
        class={`relative z-10 flex h-10 min-w-0 flex-1 items-center justify-center rounded-full transition ${
          selectedTool === tool.id ? 'text-white' : 'text-muted-foreground'
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

<style>
  .mobile-tool-dock {
    --mobile-tool-width: 14.285714%;
    --mobile-tool-offset: 0%;
  }

  .mobile-tool-dock__thumb {
    width: var(--mobile-tool-width);
    transform: translateX(var(--mobile-tool-offset));
    transition:
      transform 220ms ease-out,
      width 220ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .mobile-tool-dock__thumb {
      transition: none;
    }
  }
</style>
