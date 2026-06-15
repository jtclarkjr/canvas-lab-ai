<script lang="ts">
  import {
    ArrowDown,
    ArrowDownToLine,
    ArrowRight,
    ArrowUp,
    ArrowUpToLine,
    Circle,
    CornerDownRight,
    Diamond,
    Spline,
    Square
  } from 'lucide-svelte'
  import type {
    Arrowhead,
    ConnectorKind,
    DiagramFormatting,
    ShapeKind,
    StrokeStyle,
    Tool
  } from '$lib/canvas/types'

  let {
    formatting,
    selectedTool,
    selectedCount,
    hasShapeSelection,
    hasConnectorSelection,
    isVisible,
    onShapeKindChange,
    onConnectorKindChange,
    onFillColorChange,
    onStrokeColorChange,
    onStrokeWidthChange,
    onStrokeStyleChange,
    onOpacityChange,
    onStartArrowChange,
    onEndArrowChange,
    onArrange
  } = $props<{
    formatting: DiagramFormatting
    selectedTool: Tool
    selectedCount: number
    hasShapeSelection: boolean
    hasConnectorSelection: boolean
    isVisible: boolean
    onShapeKindChange: (kind: ShapeKind) => void
    onConnectorKindChange: (kind: ConnectorKind) => void
    onFillColorChange: (color: string) => void
    onStrokeColorChange: (color: string) => void
    onStrokeWidthChange: (width: number) => void
    onStrokeStyleChange: (style: StrokeStyle) => void
    onOpacityChange: (opacity: number) => void
    onStartArrowChange: (arrowhead: Arrowhead) => void
    onEndArrowChange: (arrowhead: Arrowhead) => void
    onArrange: (action: 'front' | 'forward' | 'backward' | 'back') => void
  }>()

  const strokeColors = [
    '#000000',
    '#dc2626',
    '#16a34a',
    '#2563eb',
    '#d97706',
    '#7c3aed'
  ]
  const fillColors = [
    '#ffffff',
    '#fecaca',
    '#bbf7d0',
    '#bfdbfe',
    '#fef08a',
    'transparent'
  ]
  const widths = [1, 2, 4]

  const showShapeControls = $derived(
    selectedTool === 'shape' || hasShapeSelection
  )
  const showConnectorControls = $derived(
    selectedTool === 'connector' || hasConnectorSelection
  )

  function preventEditorBlur(event: MouseEvent) {
    event.preventDefault()
  }

  function handleOpacityChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const value = Number.parseInt(target.value, 10)
    if (!Number.isNaN(value)) {
      onOpacityChange(Math.min(Math.max(value, 10), 100) / 100)
    }
  }

  function buttonClass(active: boolean) {
    return `flex h-8 w-8 items-center justify-center rounded-lg transition ${
      active
        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`
  }

  function swatchClass(active: boolean) {
    return `size-6 rounded-md border transition ${
      active ? 'border-primary ring-2 ring-primary/25' : 'border-border'
    }`
  }
</script>

{#if isVisible}
  <div
    class="toolbar-pill pointer-events-auto fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 p-1"
    data-diagram-toolbar
  >
    {#if showShapeControls}
      <div class="flex items-center gap-0.5 border-r border-border/70 pr-1">
        <button
          type="button"
          class={buttonClass(formatting.shapeKind === 'rectangle')}
          onmousedown={preventEditorBlur}
          onclick={() => onShapeKindChange('rectangle')}
          aria-label="Rectangle"
          aria-pressed={formatting.shapeKind === 'rectangle'}
        >
          <Square class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(formatting.shapeKind === 'diamond')}
          onmousedown={preventEditorBlur}
          onclick={() => onShapeKindChange('diamond')}
          aria-label="Diamond"
          aria-pressed={formatting.shapeKind === 'diamond'}
        >
          <Diamond class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(formatting.shapeKind === 'ellipse')}
          onmousedown={preventEditorBlur}
          onclick={() => onShapeKindChange('ellipse')}
          aria-label="Ellipse"
          aria-pressed={formatting.shapeKind === 'ellipse'}
        >
          <Circle class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}

    {#if showConnectorControls}
      <div class="flex items-center gap-0.5 border-r border-border/70 pr-1">
        <button
          type="button"
          class={buttonClass(formatting.connectorKind === 'straight')}
          onmousedown={preventEditorBlur}
          onclick={() => onConnectorKindChange('straight')}
          aria-label="Straight connector"
          aria-pressed={formatting.connectorKind === 'straight'}
        >
          <ArrowRight class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(formatting.connectorKind === 'elbow')}
          onmousedown={preventEditorBlur}
          onclick={() => onConnectorKindChange('elbow')}
          aria-label="Elbow connector"
          aria-pressed={formatting.connectorKind === 'elbow'}
        >
          <CornerDownRight class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(formatting.connectorKind === 'curved')}
          onmousedown={preventEditorBlur}
          onclick={() => onConnectorKindChange('curved')}
          aria-label="Curved connector"
          aria-pressed={formatting.connectorKind === 'curved'}
        >
          <Spline class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}

    <div class="flex items-center gap-1 border-r border-border/70 px-1">
      {#each strokeColors as color (color)}
        <button
          type="button"
          class={swatchClass(formatting.strokeColor === color)}
          style={`background:${color}`}
          onmousedown={preventEditorBlur}
          onclick={() => onStrokeColorChange(color)}
          aria-label={`Stroke color ${color}`}
          aria-pressed={formatting.strokeColor === color}
        ></button>
      {/each}
    </div>

    {#if showShapeControls}
      <div class="flex items-center gap-1 border-r border-border/70 px-1">
        {#each fillColors as color (color)}
          <button
            type="button"
            class={swatchClass(formatting.fillColor === color)}
            style={color === 'transparent'
              ? 'background-image:linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%);background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0'
              : `background:${color}`}
            onmousedown={preventEditorBlur}
            onclick={() => onFillColorChange(color)}
            aria-label={color === 'transparent'
              ? 'Fill transparent'
              : `Fill color ${color}`}
            aria-pressed={formatting.fillColor === color}
          ></button>
        {/each}
      </div>
    {/if}

    <div class="flex items-center gap-0.5 border-r border-border/70 px-1">
      {#each widths as width (width)}
        <button
          type="button"
          class={buttonClass(formatting.strokeWidth === width)}
          onmousedown={preventEditorBlur}
          onclick={() => onStrokeWidthChange(width)}
          aria-label={`Stroke width ${width}`}
          aria-pressed={formatting.strokeWidth === width}
        >
          <span
            class="w-4 rounded-full bg-current"
            style={`height:${width}px`}
            aria-hidden="true"
          ></span>
        </button>
      {/each}
    </div>

    <div class="flex items-center gap-0.5 border-r border-border/70 px-1">
      <button
        type="button"
        class={buttonClass(formatting.strokeStyle === 'solid')}
        onmousedown={preventEditorBlur}
        onclick={() => onStrokeStyleChange('solid')}
        aria-label="Solid stroke"
        aria-pressed={formatting.strokeStyle === 'solid'}
      >
        <span class="h-0.5 w-4 rounded-full bg-current" aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        class={buttonClass(formatting.strokeStyle === 'dashed')}
        onmousedown={preventEditorBlur}
        onclick={() => onStrokeStyleChange('dashed')}
        aria-label="Dashed stroke"
        aria-pressed={formatting.strokeStyle === 'dashed'}
      >
        <span
          class="h-0.5 w-4"
          style="background:repeating-linear-gradient(90deg,currentColor 0 4px,transparent 4px 7px)"
          aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        class={buttonClass(formatting.strokeStyle === 'dotted')}
        onmousedown={preventEditorBlur}
        onclick={() => onStrokeStyleChange('dotted')}
        aria-label="Dotted stroke"
        aria-pressed={formatting.strokeStyle === 'dotted'}
      >
        <span
          class="h-1 w-4"
          style="background:repeating-linear-gradient(90deg,currentColor 0 2px,transparent 2px 5px)"
          aria-hidden="true"
        ></span>
      </button>
    </div>

    {#if showConnectorControls}
      <div class="flex items-center gap-0.5 border-r border-border/70 px-1">
        <button
          type="button"
          class={buttonClass(formatting.startArrow === 'arrow')}
          onmousedown={preventEditorBlur}
          onclick={() =>
            onStartArrowChange(
              formatting.startArrow === 'arrow' ? 'none' : 'arrow'
            )}
          aria-label="Start arrowhead"
          aria-pressed={formatting.startArrow === 'arrow'}
        >
          <ArrowRight class="size-4 rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(formatting.endArrow === 'arrow')}
          onmousedown={preventEditorBlur}
          onclick={() =>
            onEndArrowChange(
              formatting.endArrow === 'arrow' ? 'none' : 'arrow'
            )}
          aria-label="End arrowhead"
          aria-pressed={formatting.endArrow === 'arrow'}
        >
          <ArrowRight class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}

    <div class="flex items-center gap-2 border-r border-border/70 px-2">
      <input
        class="h-1 w-20 cursor-pointer accent-primary"
        min="10"
        max="100"
        step="5"
        type="range"
        value={Math.round(formatting.opacity * 100)}
        oninput={handleOpacityChange}
        aria-label="Opacity"
        aria-valuetext={`${Math.round(formatting.opacity * 100)}%`}
      />
    </div>

    {#if selectedCount > 0}
      <div class="flex items-center gap-0.5 pl-1">
        <button
          type="button"
          class={buttonClass(false)}
          onmousedown={preventEditorBlur}
          onclick={() => onArrange('back')}
          aria-label="Send to back"
        >
          <ArrowDownToLine class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(false)}
          onmousedown={preventEditorBlur}
          onclick={() => onArrange('backward')}
          aria-label="Send backward"
        >
          <ArrowDown class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(false)}
          onmousedown={preventEditorBlur}
          onclick={() => onArrange('forward')}
          aria-label="Bring forward"
        >
          <ArrowUp class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class={buttonClass(false)}
          onmousedown={preventEditorBlur}
          onclick={() => onArrange('front')}
          aria-label="Bring to front"
        >
          <ArrowUpToLine class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}
  </div>
{/if}
