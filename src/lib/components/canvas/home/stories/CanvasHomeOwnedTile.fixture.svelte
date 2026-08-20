<script lang="ts">
  import CanvasHomeOwnedTile from '../CanvasHomeOwnedTile.svelte'
  import { ownerCanvas } from './fixtures'

  let {
    initialEditing = false,
    initialMenuOpen = false,
    isOpening = false
  } = $props<{
    initialEditing?: boolean
    initialMenuOpen?: boolean
    isOpening?: boolean
  }>()

  let isEditingTitle = $state(false)
  let editingTitle = $state(ownerCanvas.title)
  let titleInputEl = $state<HTMLInputElement | null>(null)
  let menuOpen = $state(false)

  $effect(() => {
    isEditingTitle = initialEditing
    menuOpen = initialMenuOpen
  })
</script>

<div class="w-64 p-6">
  <CanvasHomeOwnedTile
    canvas={ownerCanvas}
    {isEditingTitle}
    bind:editingTitle
    bind:titleInputEl
    savingTitle={false}
    {isOpening}
    isDimmed={false}
    {menuOpen}
    dateLabel="Updated"
    dateValue={ownerCanvas.updatedAt}
    onNavigate={() => undefined}
    onToggleMenu={() => (menuOpen = !menuOpen)}
    onUploadIcon={() => undefined}
    onStartRename={() => {
      isEditingTitle = true
    }}
    onDelete={() => undefined}
    onCommitRename={() => {
      isEditingTitle = false
    }}
    onRenameKeydown={() => undefined}
  />
</div>
