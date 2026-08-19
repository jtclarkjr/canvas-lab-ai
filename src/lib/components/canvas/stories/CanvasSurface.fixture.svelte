<script lang="ts">
  import type { DiagramShape } from '$lib/canvas/types'
  import CanvasSurface from '../CanvasSurface.svelte'

  const shape: DiagramShape = {
    id: 'shape-1',
    kind: 'rectangle',
    x: 120,
    y: 90,
    width: 240,
    height: 140,
    rotation: 0,
    fillColor: '#ede9fe',
    strokeColor: '#7c3aed',
    strokeWidth: 2,
    strokeStyle: 'solid',
    opacity: 1,
    text: 'Reusable component boundary',
    textColor: '#4c1d95',
    textFontSize: 18,
    textIsBold: true
  }
</script>

<div
  class="relative h-[30rem] w-full overflow-hidden rounded-2xl bg-background"
>
  <CanvasSurface
    camera={{ x: 40, y: 40, scale: 1 }}
    canEdit={true}
    selectedTool="select"
    drawFormatting={{
      width: 3,
      color: '#7c3aed',
      style: 'freeform',
      isHighlighter: false,
      highlighterOpacity: 0.3
    }}
    editingText={null}
    elements={{
      paths: [],
      currentPath: [],
      textElements: [],
      shapes: [shape],
      connectors: [],
      scenes: []
    }}
    selection={{ selectedIds: new Set(['shape-1']), start: null, end: null }}
    handlers={{
      pointerDown: () => undefined,
      pointerMove: () => undefined,
      pointerUp: () => undefined,
      doubleClick: () => undefined
    }}
  />
</div>
