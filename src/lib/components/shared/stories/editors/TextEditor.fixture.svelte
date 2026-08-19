<script lang="ts">
  import type { EditingText } from '$lib/canvas/types'
  import TextEditor from '../../editors/TextEditor.svelte'

  let editingText = $state<EditingText>({
    id: 'story-text',
    target: 'text',
    x: 56,
    y: 48,
    value: 'Editable canvas text',
    width: 260,
    rotation: -2,
    textAlign: 'left'
  })
  let selectionChanges = $state(0)
</script>

<div class="relative h-64 overflow-hidden rounded-2xl bg-muted/40 p-4">
  <TextEditor
    camera={{ x: 0, y: 0, scale: 1 }}
    {editingText}
    textFormatting={{
      fontSize: 24,
      isBold: true,
      isItalic: false,
      isUnderline: false,
      color: '#334155',
      listStyle: 'none'
    }}
    onValueChange={(value) => (editingText = { ...editingText, value })}
    onBlur={() => undefined}
    onKeydown={() => undefined}
    onSelectionChange={() => (selectionChanges += 1)}
  />
  <p
    class="absolute right-4 bottom-4 text-xs text-muted-foreground"
    data-testid="selection-count"
  >
    Selection events: {selectionChanges}
  </p>
</div>
