<script lang="ts">
  import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Minus,
    Palette,
    Plus,
    Underline
  } from 'lucide-svelte'
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

  function preventEditorBlur(event: MouseEvent) {
    event.preventDefault()
  }

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
    class="toolbar-pill pointer-events-auto fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 p-1"
    data-text-formatting-toolbar
  >
    <div class="flex items-center gap-1 rounded-lg bg-secondary/70 px-2">
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
        onmousedown={preventEditorBlur}
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
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:text-foreground"
        onmousedown={preventEditorBlur}
        onclick={() => onFontSizeChange(Math.min(fontSize + 2, 100))}
        aria-label="Increase font size"
      >
        <Plus class="size-3" aria-hidden="true" />
      </button>
    </div>

    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isBold
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onBoldToggle}
      aria-label="Bold"
      aria-pressed={isBold}
    >
      <Bold class="size-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isItalic
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onItalicToggle}
      aria-label="Italic"
      aria-pressed={isItalic}
    >
      <Italic class="size-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isUnderline
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onUnderlineToggle}
      aria-label="Underline"
      aria-pressed={isUnderline}
    >
      <Underline class="size-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        listStyle === 'bullet'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={() => onListStyleChange('bullet')}
      aria-label="Bullet list"
      aria-pressed={listStyle === 'bullet'}
    >
      <List class="size-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        listStyle === 'number'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
      onmousedown={preventEditorBlur}
      onclick={() => onListStyleChange('number')}
      aria-label="Numbered list"
      aria-pressed={listStyle === 'number'}
    >
      <ListOrdered class="size-4" aria-hidden="true" />
    </button>

    <div class="relative">
      <label
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        for="text-color"
        title="Text color"
      >
        <Palette class="size-4" />
      </label>
      <input
        id="text-color"
        class="absolute inset-0 cursor-pointer opacity-0"
        type="color"
        value={color}
        oninput={(event) =>
          onColorChange((event.currentTarget as HTMLInputElement).value)}
      />
    </div>
  </div>
{/if}
