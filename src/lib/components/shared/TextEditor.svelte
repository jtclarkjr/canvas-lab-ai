<script lang="ts">
  import type { Camera, EditingText, TextFormatting } from '$lib/canvas/types'
  import {
    getTextEditorWidth,
    getTextLines,
    TEXT_LINE_HEIGHT
  } from '$lib/canvas/drawing-utils'
  import { resolveCanvasDisplayColor } from '$lib/canvas/helpers/display-color'

  let {
    textInputEl = $bindable(null),
    camera,
    editingText,
    textFormatting,
    onValueChange,
    onBlur,
    onKeydown,
    onSelectionChange
  } = $props<{
    textInputEl?: HTMLTextAreaElement | null
    camera: Camera
    editingText: EditingText | null
    textFormatting: TextFormatting
    onValueChange: (value: string) => void
    onBlur: (event: FocusEvent) => void
    onKeydown: (event: KeyboardEvent) => void
    onSelectionChange: () => void
  }>()

  function editorWidth(lines: string[]) {
    return editingText?.width
      ? editingText.width * camera.scale
      : getTextEditorWidth(lines, textFormatting.fontSize, camera.scale)
  }

  function editorTransform() {
    return editingText?.rotation ? `rotate(${editingText.rotation}deg)` : 'none'
  }
</script>

{#if editingText}
  {@const lines = getTextLines(editingText.value)}
  <textarea
    bind:this={textInputEl}
    class="absolute border-none bg-transparent caret-current outline-none"
    style={`left:${camera.x + editingText.x * camera.scale}px;top:${camera.y + editingText.y * camera.scale}px;font-size:${textFormatting.fontSize * camera.scale}px;line-height:${TEXT_LINE_HEIGHT};color:${resolveCanvasDisplayColor(textFormatting.color)};font-weight:${textFormatting.isBold ? 'bold' : 'normal'};font-style:${textFormatting.isItalic ? 'italic' : 'normal'};text-decoration:${textFormatting.isUnderline ? 'underline' : 'none'};text-align:${editingText.textAlign ?? 'left'};width:${editorWidth(lines)}px;resize:none;overflow:hidden;white-space:pre;box-shadow:inset 0 0 0 1px var(--canvas-selection-shadow);padding:0;margin:0;transform:${editorTransform()};transform-origin:center center`}
    rows={lines.length}
    wrap="off"
    value={editingText.value}
    oninput={(event) => {
      onValueChange((event.currentTarget as HTMLTextAreaElement).value)
      onSelectionChange()
    }}
    onblur={onBlur}
    onkeydown={onKeydown}
    onkeyup={onSelectionChange}
    onpointerup={onSelectionChange}
    onselect={onSelectionChange}
  ></textarea>
{/if}
