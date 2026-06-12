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

  const thumbStyle = $derived(`transform: translateX(${mode === 'scenes' ? '100%' : '0%'})`)
</script>

<!-- Bottom-left: top-center belongs to the drawing/text formatting
     toolbars, which would overlap the switcher there. -->
<div class="fixed bottom-6 left-6 z-30">
  <div class="toolbar-pill relative grid grid-cols-2 p-1">
    <span
      class="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
      style={thumbStyle}
      aria-hidden="true"
    ></span>
    {#each modes as entry (entry.id)}
      <button
        type="button"
        class={`relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
          mode === entry.id ? 'text-white' : 'text-slate-300 hover:text-white'
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
