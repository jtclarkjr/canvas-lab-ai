<script lang="ts">
  import { Highlighter, Palette, Slash, Spline } from 'lucide-svelte'
  import type { DrawStyle } from '$lib/canvas/types'

  let {
    width,
    color,
    style,
    isHighlighter,
    highlighterOpacity,
    onWidthChange,
    onColorChange,
    onStyleChange,
    onHighlighterToggle,
    onHighlighterOpacityChange,
    isVisible
  } = $props<{
    width: number
    color: string
    style: DrawStyle
    isHighlighter: boolean
    highlighterOpacity: number
    onWidthChange: (width: number) => void
    onColorChange: (color: string) => void
    onStyleChange: (style: DrawStyle) => void
    onHighlighterToggle: () => void
    onHighlighterOpacityChange: (opacity: number) => void
    isVisible: boolean
  }>()

  function preventEditorBlur(event: MouseEvent) {
    event.preventDefault()
  }

  function handleWidthChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const value = Number.parseInt(target.value, 10)
    if (!Number.isNaN(value)) {
      onWidthChange(Math.min(Math.max(value, 1), 24))
    }
  }

  function handleHighlighterOpacityChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const value = Number.parseInt(target.value, 10)
    if (!Number.isNaN(value)) {
      onHighlighterOpacityChange(Math.min(Math.max(value, 10), 90) / 100)
    }
  }
</script>

{#if isVisible}
  <div
    class="toolbar-pill pointer-events-auto fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 p-1"
    data-drawing-toolbar
  >
    <div class="flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-1.5">
      <input
        class="h-1 w-24 cursor-pointer accent-primary"
        min="1"
        max="24"
        step="1"
        type="range"
        value={width}
        oninput={handleWidthChange}
        aria-label="Stroke width"
      />
      <span class="w-6 text-center text-sm text-foreground">{width}</span>
    </div>

    <div class="relative">
      <label
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        for="draw-color"
        title="Stroke color"
      >
        <Palette class="size-4" />
      </label>
      <input
        id="draw-color"
        class="absolute inset-0 cursor-pointer opacity-0"
        type="color"
        value={color}
        oninput={(event) =>
          onColorChange((event.currentTarget as HTMLInputElement).value)}
      />
    </div>

    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        style === 'freeform'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={() => onStyleChange('freeform')}
      aria-label="Freeform"
      aria-pressed={style === 'freeform'}
    >
      <Spline class="size-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        style === 'straight'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={() => onStyleChange('straight')}
      aria-label="Straight line"
      aria-pressed={style === 'straight'}
    >
      <Slash class="size-4" aria-hidden="true" />
    </button>

    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isHighlighter
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onHighlighterToggle}
      aria-label="Highlighter"
      aria-pressed={isHighlighter}
    >
      <Highlighter class="size-4" aria-hidden="true" />
    </button>
    {#if isHighlighter}
      <div
        class="flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-1.5"
      >
        <input
          class="h-1 w-16 cursor-pointer accent-primary"
          min="10"
          max="90"
          step="5"
          type="range"
          value={Math.round(highlighterOpacity * 100)}
          oninput={handleHighlighterOpacityChange}
          aria-label="Highlighter opacity"
          aria-valuetext={`${Math.round(highlighterOpacity * 100)}%`}
        />
        <span class="w-9 text-center text-sm text-foreground">
          {Math.round(highlighterOpacity * 100)}%
        </span>
      </div>
    {/if}
  </div>
{/if}
