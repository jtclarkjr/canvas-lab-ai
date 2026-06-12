<script lang="ts">
  import { LayoutGrid, PenLine } from 'lucide-svelte'
  import type { WorkspaceMode } from '$lib/scenes/types'

  let { mode, onModeChange } = $props<{
    mode: WorkspaceMode
    onModeChange: (mode: WorkspaceMode) => void
  }>()

  const modes = [
    { id: 'editor' as WorkspaceMode, icon: PenLine, label: 'Editor' },
    { id: 'scenes' as WorkspaceMode, icon: LayoutGrid, label: 'Scenes' }
  ]
</script>

<!-- Bottom-left: top-center belongs to the drawing/text formatting
     toolbars, which would overlap the switcher there. -->
<div class="fixed bottom-6 left-6 z-20">
  <div class="toolbar-pill flex items-center gap-1 p-1">
    {#each modes as entry (entry.id)}
      <button
        type="button"
        class={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
          mode === entry.id
            ? 'bg-primary text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        aria-pressed={mode === entry.id}
        onclick={() => onModeChange(entry.id)}
      >
        <entry.icon class="size-4" />
        {entry.label}
      </button>
    {/each}
  </div>
</div>
