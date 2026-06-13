<script lang="ts">
  import { LayoutGrid, PenLine, Workflow as WorkflowIcon } from 'lucide-svelte'
  import type { WorkspaceMode } from '$lib/scenes/types'

  let {
    mode,
    workflowEnabled = false,
    onModeChange
  } = $props<{
    mode: WorkspaceMode
    workflowEnabled?: boolean
    onModeChange: (mode: WorkspaceMode) => void
  }>()

  const availableModes = $derived([
    { id: 'editor' as WorkspaceMode, icon: PenLine, label: 'Editor' },
    { id: 'scenes' as WorkspaceMode, icon: LayoutGrid, label: 'Scenes' },
    ...(workflowEnabled
      ? [
          {
            id: 'workflows' as WorkspaceMode,
            icon: WorkflowIcon,
            label: 'Workflows'
          }
        ]
      : [])
  ])
  const modes = $derived(availableModes)

  const activeIndex = $derived(
    Math.max(
      0,
      modes.findIndex((entry) => entry.id === mode)
    )
  )
  const columnCount = $derived(modes.length)
  const thumbStyle = $derived(`transform: translateX(${activeIndex * 100}%)`)
</script>

<!-- Bottom-left: top-center belongs to the drawing/text formatting
     toolbars, which would overlap the switcher there. -->
<div class="fixed bottom-6 left-6 z-30">
  <div
    class={`toolbar-pill relative grid p-1 ${columnCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
  >
    <span
      class="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
      style={`width:calc((100% - 0.5rem) / ${columnCount});${thumbStyle}`}
      aria-hidden="true"
    ></span>
    {#each modes as entry (entry.id)}
      <button
        type="button"
        class={`relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
          mode === entry.id
            ? 'text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
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
