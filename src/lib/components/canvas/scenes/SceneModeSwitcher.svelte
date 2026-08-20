<script lang="ts">
  import { LayoutGrid, PenLine, Workflow as WorkflowIcon } from 'lucide-svelte'
  import type { WorkspaceMode } from '$lib/scenes/types'
  import { SegmentedControl } from '$lib/components/ui'

  let {
    mode,
    workflowEnabled = false,
    onModeChange
  } = $props<{
    mode: WorkspaceMode
    workflowEnabled?: boolean
    onModeChange: (mode: WorkspaceMode) => void
  }>()

  const MODE_BUTTON_WIDTH_REM = 6.5
  const MODE_ICON_WIDTH_REM = 2
  const SWITCHER_PADDING_REM = 0.5

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
  const modeItems = $derived(
    modes.map((entry) => ({
      value: entry.id,
      label: `Switch to ${entry.label} mode`,
      title: entry.label
    }))
  )

  const activeIndex = $derived(
    Math.max(
      0,
      modes.findIndex((entry) => entry.id === mode)
    )
  )
  const columnCount = $derived(modes.length)
  const switcherStyle = $derived(
    [
      `--mode-count:${columnCount}`,
      `--active-index:${activeIndex}`,
      // +2px accounts for the toolbar-pill 1px border on each side, which
      // border-box would otherwise eat from the inner thumb/button geometry.
      `--switcher-expanded-width:calc(${columnCount * MODE_BUTTON_WIDTH_REM + SWITCHER_PADDING_REM}rem + 2px)`,
      `--switcher-expanded-thumb-offset:${activeIndex * MODE_BUTTON_WIDTH_REM}rem`,
      `--switcher-collapsed-track-offset:${activeIndex * -MODE_ICON_WIDTH_REM}rem`
    ].join(';')
  )
</script>

<!-- Bottom-left: top-center belongs to the drawing/text formatting
     toolbars, which would overlap the switcher there. -->
<div class="fixed bottom-6 left-6 z-30">
  <SegmentedControl
    value={mode}
    items={modeItems}
    label="Workspace mode"
    variant="unstyled"
    class="mode-switcher toolbar-pill relative overflow-hidden p-1"
    style={switcherStyle}
    listClass="mode-switcher__track relative z-10 flex items-center"
    triggerClass="mode-switcher__button flex h-8 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 text-xs font-medium whitespace-nowrap text-muted-foreground hover:text-foreground data-[state=active]:text-primary-foreground"
    onValueChange={(value) => {
      const entry = modes.find((candidate) => candidate.id === value)
      if (entry) onModeChange(entry.id)
    }}
  >
    {#snippet decoration()}
      <span
        class="mode-switcher__thumb pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-primary shadow-sm"
        aria-hidden="true"
      ></span>
    {/snippet}
    {#snippet item(option)}
      {@const entry = modes.find((candidate) => candidate.id === option.value)}
      {#if entry}
        <entry.icon class="size-4 shrink-0" aria-hidden="true" />
        <span class="mode-switcher__label">{entry.label}</span>
      {/if}
    {/snippet}
  </SegmentedControl>
</div>

<style>
  :global(.mode-switcher) {
    --switcher-button-width: 6.5rem;
    --switcher-icon-width: 2rem;
    /* 2rem icon + 0.5rem padding + 2px for the toolbar-pill border (border-box). */
    --switcher-collapsed-width: calc(2.5rem + 2px);

    width: var(--switcher-expanded-width);
    transition:
      width 220ms ease-out,
      border-color 200ms ease-out,
      background-color 200ms ease-out,
      color 200ms ease-out;
  }

  :global(.mode-switcher__track) {
    transform: translateX(0);
    transition: transform 220ms ease-out;
  }

  :global(.mode-switcher__thumb) {
    width: var(--switcher-button-width);
    transform: translateX(var(--switcher-expanded-thumb-offset));
    transition:
      width 220ms ease-out,
      transform 220ms ease-out;
  }

  :global(.mode-switcher__button) {
    width: var(--switcher-button-width);
    transition:
      width 220ms ease-out,
      gap 180ms ease-out,
      padding 180ms ease-out,
      color 200ms ease-out;
  }

  :global(.mode-switcher__label) {
    display: inline-block;
    max-width: 4.75rem;
    overflow: hidden;
    opacity: 1;
    transition:
      max-width 180ms ease-out,
      opacity 140ms ease-out;
  }

  @media (hover: hover) and (pointer: fine) {
    :global(.mode-switcher:not(:hover):not(:focus-within)) {
      width: var(--switcher-collapsed-width);
    }

    :global(
      .mode-switcher:not(:hover):not(:focus-within) .mode-switcher__track
    ) {
      transform: translateX(var(--switcher-collapsed-track-offset));
    }

    :global(
      .mode-switcher:not(:hover):not(:focus-within) .mode-switcher__thumb
    ) {
      width: var(--switcher-icon-width);
      transform: translateX(0);
    }

    :global(
      .mode-switcher:not(:hover):not(:focus-within) .mode-switcher__button
    ) {
      width: var(--switcher-icon-width);
      gap: 0;
      padding-left: 0;
      padding-right: 0;
    }

    :global(
      .mode-switcher:not(:hover):not(:focus-within) .mode-switcher__label
    ) {
      max-width: 0;
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.mode-switcher),
    :global(.mode-switcher__track),
    :global(.mode-switcher__thumb),
    :global(.mode-switcher__button),
    :global(.mode-switcher__label) {
      transition: none;
    }
  }
</style>
