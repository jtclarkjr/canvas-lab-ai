<script lang="ts">
  import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Minus,
    Palette,
    Plus,
    SlidersHorizontal,
    Underline
  } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import type { ListStyle } from '$lib/canvas/types'

  let {
    fontSize,
    isBold,
    isItalic,
    isUnderline,
    color,
    listStyle,
    onFontSizeChange,
    onBoldToggle,
    onItalicToggle,
    onUnderlineToggle,
    onColorChange,
    onListStyleChange,
    isVisible
  } = $props<{
    fontSize: number
    isBold: boolean
    isItalic: boolean
    isUnderline: boolean
    color: string
    listStyle: ListStyle
    onFontSizeChange: (size: number) => void
    onBoldToggle: () => void
    onItalicToggle: () => void
    onUnderlineToggle: () => void
    onColorChange: (color: string) => void
    onListStyleChange: (style: Exclude<ListStyle, 'none'>) => void
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

  function handleFontSizeChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const value = Number.parseInt(target.value, 10)
    if (!Number.isNaN(value)) {
      onFontSizeChange(Math.min(Math.max(value, 8), 100))
    }
  }
</script>

{#if isVisible}
  <div
    bind:this={mobileToolbarEl}
    class="pointer-events-auto fixed left-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40"
    data-text-formatting-toolbar
    data-camera-exempt
  >
    <div class="relative">
      {#if mobileOptionsOpen}
        <div
          class="absolute left-0 bottom-14 w-48 rounded-xl border border-border/70 bg-popover p-3 text-popover-foreground shadow-2xl"
        >
          <div class="space-y-3">
            <div>
              <p class="mb-2 text-xs font-medium text-muted-foreground">
                Font size
              </p>
              <div
                class="flex items-center gap-2 rounded-lg bg-secondary/70 px-2 py-1"
              >
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded text-muted-foreground"
                  onclick={() => onFontSizeChange(Math.max(fontSize - 2, 8))}
                  aria-label="Decrease font size"
                >
                  <Minus class="size-3" aria-hidden="true" />
                </button>
                <input
                  class="w-12 border-0 bg-transparent text-center text-sm text-foreground outline-none"
                  min="8"
                  max="100"
                  type="number"
                  value={fontSize}
                  oninput={handleFontSizeChange}
                  aria-label="Font size"
                />
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded text-muted-foreground"
                  onclick={() => onFontSizeChange(Math.min(fontSize + 2, 100))}
                  aria-label="Increase font size"
                >
                  <Plus class="size-3" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-medium text-muted-foreground">
                Text style
              </p>
              <div class="flex gap-1">
                <button
                  type="button"
                  class={`flex size-9 items-center justify-center rounded-lg transition ${
                    isUnderline
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                  onclick={onUnderlineToggle}
                  aria-label="Underline"
                  aria-pressed={isUnderline}
                >
                  <Underline class="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class={`flex size-9 items-center justify-center rounded-lg transition ${
                    listStyle === 'bullet'
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                  onclick={() => onListStyleChange('bullet')}
                  aria-label="Bullet list"
                  aria-pressed={listStyle === 'bullet'}
                >
                  <List class="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class={`flex size-9 items-center justify-center rounded-lg transition ${
                    listStyle === 'number'
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                  onclick={() => onListStyleChange('number')}
                  aria-label="Numbered list"
                  aria-pressed={listStyle === 'number'}
                >
                  <ListOrdered class="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div
        class="flex items-center gap-1 rounded-full border border-border/70 bg-card/95 p-1 text-card-foreground shadow-2xl backdrop-blur"
      >
        <div class="relative">
          <label
            class="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border/70"
            for="text-color-mobile"
            style={`background:${color}`}
            title="Text color"
            aria-label="Text color"
          >
            <Palette class="size-4 opacity-0" aria-hidden="true" />
          </label>
          <input
            id="text-color-mobile"
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
            isBold
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground'
          }`}
          onclick={onBoldToggle}
          aria-label="Bold"
          aria-pressed={isBold}
        >
          <Bold class="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          class={`flex size-10 items-center justify-center rounded-lg transition ${
            isItalic
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground'
          }`}
          onclick={onItalicToggle}
          aria-label="Italic"
          aria-pressed={isItalic}
        >
          <Italic class="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          class={`flex size-10 items-center justify-center rounded-lg transition ${
            mobileOptionsOpen
              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
              : 'text-muted-foreground'
          }`}
          onclick={() => (mobileOptionsOpen = !mobileOptionsOpen)}
          aria-label="Text options"
          aria-expanded={mobileOptionsOpen}
        >
          <SlidersHorizontal class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
{/if}
