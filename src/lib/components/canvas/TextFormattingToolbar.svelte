<script lang="ts">
  import { Bold, Italic, List, ListOrdered, Minus, Palette, Plus, Underline } from 'lucide-svelte'
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
    class="pointer-events-auto fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-800/80 bg-black/60 p-1 shadow-lg shadow-black/40 backdrop-blur"
    data-text-formatting-toolbar
  >
    <div class="flex items-center gap-1 rounded-lg bg-slate-900/40 px-2">
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition hover:text-white"
        onmousedown={preventEditorBlur}
        onclick={() => onFontSizeChange(Math.max(fontSize - 2, 8))}
        title="Decrease font size"
      >
        <Minus class="size-3" />
      </button>
      <input
        class="w-12 border-0 bg-transparent text-center text-sm text-slate-200 outline-none"
        min="8"
        max="100"
        type="number"
        value={fontSize}
        oninput={handleFontSizeChange}
        title="Font size"
      />
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition hover:text-white"
        onmousedown={preventEditorBlur}
        onclick={() => onFontSizeChange(Math.min(fontSize + 2, 100))}
        title="Increase font size"
      >
        <Plus class="size-3" />
      </button>
    </div>

    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isBold ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onBoldToggle}
      title="Bold"
    >
      <Bold class="size-4" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isItalic ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onItalicToggle}
      title="Italic"
    >
      <Italic class="size-4" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        isUnderline ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      onmousedown={preventEditorBlur}
      onclick={onUnderlineToggle}
      title="Underline"
    >
      <Underline class="size-4" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        listStyle === 'bullet'
          ? 'bg-primary text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      onmousedown={preventEditorBlur}
      onclick={() => onListStyleChange('bullet')}
      title="Bullet list"
    >
      <List class="size-4" />
    </button>
    <button
      type="button"
      class={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        listStyle === 'number'
          ? 'bg-primary text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      onmousedown={preventEditorBlur}
      onclick={() => onListStyleChange('number')}
      title="Numbered list"
    >
      <ListOrdered class="size-4" />
    </button>

    <div class="relative">
      <label
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
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
        oninput={(event) => onColorChange((event.currentTarget as HTMLInputElement).value)}
      />
    </div>
  </div>
{/if}
