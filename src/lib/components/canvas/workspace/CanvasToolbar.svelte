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
  import { slide } from 'svelte/transition'
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

  let isExpanded = $state(false)

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

  function currentTool() {
    return tools.find((tool) => tool.id === selectedTool) ?? tools[0]
  }

  const CurrentIcon = $derived(currentTool().icon)
</script>

<div class="relative w-10">
  <button
    type="button"
    class="toolbar-pill flex h-10 w-10 items-center justify-center"
    onclick={() => (isExpanded = !isExpanded)}
    title="Tools"
  >
    <CurrentIcon class="size-5" />
  </button>

  {#if isExpanded}
    <div
      transition:slide={{ duration: 200, axis: 'y' }}
      class="absolute left-0 top-12 overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-xl backdrop-blur"
      style="transform-origin: top center"
    >
      <div class="flex flex-col gap-1 p-1">
        {#each tools as tool}
          <button
            type="button"
            class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              selectedTool === tool.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            onclick={() => {
              onToolChange(tool.id)
              isExpanded = false
            }}
            title={tool.label}
          >
            <tool.icon class="size-4" />
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
