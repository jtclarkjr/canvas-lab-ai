<script lang="ts">
  import {
    Bot,
    CodeXml,
    Database,
    Settings,
    Trash2,
    Workflow
  } from 'lucide-svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents/types'
  import type {
    UpdateWorkflowInput,
    Workflow as CanvasWorkflow,
    WorkflowDefinition,
    WorkflowSettings
  } from '$lib/workflows/schema'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'
  import { workflowDefinitionToYaml } from '$lib/workflows/definition'
  import MobileDatabaseGraph from '$lib/mobile/components/workflows/MobileDatabaseGraph.svelte'
  import MobileWorkflowGraph from '$lib/mobile/components/workflows/MobileWorkflowGraph.svelte'
  import MobileWorkflowSheet from '$lib/mobile/components/workflows/MobileWorkflowSheet.svelte'

  type SheetTab = 'overview' | 'code' | 'notes' | 'versions' | 'assistant'

  let {
    canvasId,
    workflow,
    scenes,
    sceneDocumentsStore,
    canEdit,
    canModify,
    onMinimize,
    onDelete,
    onPatchWorkflow,
    onPatchYaml,
    onPatchNotes,
    onPatchSettings
  } = $props<{
    canvasId: string
    workflow: CanvasWorkflow
    scenes: Scene[]
    sceneDocumentsStore: SceneDocumentsStore
    canEdit: boolean
    canModify: boolean
    onMinimize: () => void
    onDelete: (workflowId: string) => void
    onPatchWorkflow: (
      patch: UpdateWorkflowInput
    ) => Promise<CanvasWorkflow | null>
    onPatchYaml: (configYaml: string) => Promise<CanvasWorkflow | null>
    onPatchNotes: (notes: string) => Promise<CanvasWorkflow | null>
    onPatchSettings: (
      settings: WorkflowSettings
    ) => Promise<CanvasWorkflow | null>
  }>()

  let sheetTab = $state<SheetTab | null>(null)
  let dragPointerId: number | null = null
  let dragStartX = 0
  let dragStartY = 0
  let dragStartScrollable: HTMLElement | null = null
  let dragActive = false
  let dragY = $state(0)
  let dragging = $state(false)

  const sheetStyle = $derived(`transform:translateY(${dragY}px)`)
  const isDatabase = $derived(isDatabaseFlowDefinition(workflow.definition))
  const countLabel = $derived.by(() => {
    if (isDatabaseFlowDefinition(workflow.definition)) {
      return `${workflow.definition.tables.length} tables`
    }
    return `${workflow.definition.steps.length} nodes`
  })

  function close() {
    dragY = 0
    onMinimize()
  }

  function closestScrollable(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return null
    }

    let current: HTMLElement | null = target
    while (current) {
      const style = window.getComputedStyle(current)
      const canScroll =
        /(auto|scroll)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight

      if (canScroll) {
        return current
      }

      if (current.getAttribute('role') === 'dialog') {
        return null
      }

      current = current.parentElement
    }

    return null
  }

  function handleDragStart(event: PointerEvent) {
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY - dragY
    dragStartScrollable = closestScrollable(event.target)
    dragActive = false
    dragging = false
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return

    const deltaX = event.clientX - dragStartX
    const deltaY = event.clientY - dragStartY

    if (!dragActive) {
      if (
        deltaY <= 10 ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        (dragStartScrollable && dragStartScrollable.scrollTop > 0)
      ) {
        return
      }

      dragActive = true
      dragging = true
    }

    event.preventDefault()
    dragY = Math.max(0, deltaY)
  }

  function handleDragEnd(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return
    dragging = false
    dragActive = false
    dragStartScrollable = null
    dragPointerId = null

    if (dragY > 80) {
      close()
      return
    }

    dragY = 0
  }

  async function handleDefinitionChange(definition: WorkflowDefinition) {
    await onPatchWorkflow({
      definition,
      configYaml: workflowDefinitionToYaml(definition)
    })
  }
</script>

<div
  class="fixed inset-0 z-50"
  transition:fade={{ duration: 120 }}
  data-camera-exempt
>
  <button
    type="button"
    class="absolute inset-0 bg-black/35"
    onclick={close}
    aria-label="Close workflow"
  ></button>

  <div
    class={`absolute inset-x-0 bottom-0 z-10 flex h-[94dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] min-h-[20rem] flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card text-card-foreground shadow-2xl ${
      dragging ? '' : 'transition-transform duration-150'
    }`}
    style={sheetStyle}
    role="dialog"
    aria-label={`Workflow ${workflow.title}`}
    tabindex="-1"
    transition:fly={{ y: 36, duration: 180, easing: cubicOut }}
    onpointerdown={handleDragStart}
    onpointermove={handleDragMove}
    onpointerup={handleDragEnd}
    onpointercancel={handleDragEnd}
  >
    <header class="shrink-0 border-b border-border/70 px-4 pb-3 pt-2">
      <button
        type="button"
        class="mx-auto mb-3 block h-5 w-16 rounded-full"
        aria-label="Drag down to close workflow"
        onclick={close}
      >
        <span class="mx-auto block h-1 w-10 rounded-full bg-muted-foreground/30"
        ></span>
      </button>

      <div class="flex items-center gap-2">
        {#if isDatabase}
          <Database class="size-4 shrink-0 text-primary" aria-hidden="true" />
        {:else}
          <Workflow class="size-4 shrink-0 text-primary" aria-hidden="true" />
        {/if}
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-sm font-bold">{workflow.title}</h2>
          <p class="text-xs text-muted-foreground">{countLabel}</p>
        </div>
        {#if canModify}
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-muted-foreground"
            onclick={() => onDelete(workflow.id)}
            aria-label="Delete workflow"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden">
      {#if isDatabase}
        <MobileDatabaseGraph
          {workflow}
          canEdit={canEdit && canModify}
          lockedLabel="Read-only"
          onDefinitionChange={handleDefinitionChange}
        />
      {:else}
        <MobileWorkflowGraph
          {workflow}
          canEdit={canEdit && canModify}
          lockedLabel="Read-only"
          onDefinitionChange={handleDefinitionChange}
        />
      {/if}
    </div>

    <nav
      class="shrink-0 border-t border-border/70 bg-card px-3 py-2"
      style="padding-bottom:max(0.5rem, env(safe-area-inset-bottom));"
      aria-label="Workflow actions"
    >
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold"
          onclick={() => (sheetTab = 'overview')}
        >
          <Settings class="size-4" aria-hidden="true" />
          Details
        </button>
        <button
          type="button"
          class="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold"
          onclick={() => (sheetTab = 'code')}
          disabled={!canEdit}
        >
          <CodeXml class="size-4" aria-hidden="true" />
          Code
        </button>
        <button
          type="button"
          class="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold"
          onclick={() => (sheetTab = 'assistant')}
          disabled={!canEdit}
        >
          <Bot class="size-4" aria-hidden="true" />
          AI
        </button>
      </div>
    </nav>
  </div>
</div>

{#if sheetTab}
  <MobileWorkflowSheet
    {canvasId}
    {workflow}
    {scenes}
    {sceneDocumentsStore}
    {canModify}
    initialTab={sheetTab}
    onClose={() => (sheetTab = null)}
    {onPatchWorkflow}
    {onPatchYaml}
    {onPatchNotes}
    {onPatchSettings}
  />
{/if}
