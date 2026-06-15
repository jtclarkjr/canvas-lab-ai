<script lang="ts">
  import {
    Highlighter,
    Palette,
    Slash,
    SlidersHorizontal,
    Spline
  } from 'lucide-svelte'
  import { onMount } from 'svelte'
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

  let mobileOptionsOpen = $state(false)
  let mobileToolbarEl = $state<HTMLDivElement | null>(null)

  $effect(() => {
    if (!isVisible) {
      mobileOptionsOpen = false
    }
  })

  onMount(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (
        mobileOptionsOpen &&
        mobileToolbarEl &&
        !event.composedPath().includes(mobileToolbarEl)
      ) {
        mobileOptionsOpen = false
      }
    }

    document.addEventListener('pointerdown', handlePointerDownOutside, true)
    return () =>
      document.removeEventListener(
        'pointerdown',
        handlePointerDownOutside,
        true
      )
  })

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
    bind:this={mobileToolbarEl}
    class="pointer-events-auto fixed left-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40"
    data-drawing-toolbar
    data-camera-exempt
  >
    <div class="relative">
      {#if mobileOptionsOpen}
        <div
          class="absolute left-0 bottom-14 w-40 rounded-xl border border-border/70 bg-popover p-3 text-popover-foreground shadow-2xl"
        >
          <div class="space-y-3">
            <div>
              <p class="mb-2 text-xs font-medium text-muted-foreground">
                Stroke width
              </p>
              <div class="flex gap-2">
                {#each [2, 6, 12] as preset (preset)}
                  <button
                    type="button"
                    class={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                      width === preset
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                    onclick={() => onWidthChange(preset)}
                    aria-label={`Stroke width ${preset}`}
                    aria-pressed={width === preset}
                  >
                    <span
                      class="w-4 rounded-full bg-current"
                      style={`height:${Math.max(2, Math.min(preset, 8))}px`}
                      aria-hidden="true"
                    ></span>
                  </button>
                {/each}
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium text-muted-foreground">
                Stroke style
              </p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    style === 'freeform'
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                  onclick={() => onStyleChange('freeform')}
                  aria-label="Freeform"
                  aria-pressed={style === 'freeform'}
                >
                  <Spline class="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    style === 'straight'
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                  onclick={() => onStyleChange('straight')}
                  aria-label="Straight line"
                  aria-pressed={style === 'straight'}
                >
                  <Slash class="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {#if isHighlighter}
              <div>
                <p class="mb-2 text-xs font-medium text-muted-foreground">
                  Opacity
                </p>
                <input
                  class="h-1 w-full cursor-pointer accent-primary"
                  min="10"
                  max="90"
                  step="5"
                  type="range"
                  value={Math.round(highlighterOpacity * 100)}
                  oninput={handleHighlighterOpacityChange}
                  aria-label="Highlighter opacity"
                  aria-valuetext={`${Math.round(highlighterOpacity * 100)}%`}
                />
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <div
        class="flex items-center gap-1 rounded-full border border-border/70 bg-card/95 p-1 text-card-foreground shadow-2xl backdrop-blur"
      >
        <div class="relative">
          <label
            class="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border/70"
            for="draw-color-mobile"
            style={`background:${color}`}
            title="Stroke color"
            aria-label="Stroke color"
          >
            <Palette class="size-4 opacity-0" aria-hidden="true" />
          </label>
          <input
            id="draw-color-mobile"
            class="absolute inset-0 cursor-pointer opacity-0"
            type="color"
            value={color}
            oninput={(event) =>
              onColorChange((event.currentTarget as HTMLInputElement).value)}
          />
        </div>

        <button
          type="button"
          class={`flex size-10 items-center justify-center rounded-lg transition ${
            isHighlighter
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground'
          }`}
          onclick={onHighlighterToggle}
          aria-label="Highlighter"
          aria-pressed={isHighlighter}
        >
          <Highlighter class="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          class={`flex size-10 items-center justify-center rounded-lg transition ${
            mobileOptionsOpen
              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
              : 'text-muted-foreground'
          }`}
          onclick={() => (mobileOptionsOpen = !mobileOptionsOpen)}
          aria-label="Drawing options"
          aria-expanded={mobileOptionsOpen}
        >
          <SlidersHorizontal class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
{/if}
