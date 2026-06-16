<script lang="ts">
  import {
    CodeXml,
    FileText,
    History,
    LoaderCircle,
    Minus,
    NotebookPen,
    RotateCcw,
    Save,
    Table2
  } from 'lucide-svelte'
  import {
    createWorkflowVersion,
    listWorkflowVersions
  } from '$lib/workflows/api'
  import { workflowDefinitionToYaml } from '$lib/workflows/definition'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'
  import { getWorkflowFlowTypeDefinition } from '$lib/workflows/flow-types'
  import DatabaseSchemaPanel from '$lib/components/canvas/workflows/database/DatabaseSchemaPanel.svelte'
  import WorkflowDraggablePanel from '$lib/components/canvas/workflows/panels/WorkflowDraggablePanel.svelte'
  import type { DatabaseFlowDefinition } from '$lib/workflows/database/schema'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowDefinition,
    WorkflowVersion
  } from '$lib/workflows/schema'

  type PanelTab = 'schema' | 'code' | 'notepad' | 'versions'
  type PanelTabOption = {
    id: PanelTab
    label: string
    icon: typeof CodeXml
  }

  let {
    canvasId,
    workflow,
    canModify,
    fullscreen = false,
    onPatchWorkflow,
    onPatchYaml,
    onPatchNotes
  } = $props<{
    canvasId: string
    workflow: Workflow
    canModify: boolean
    fullscreen?: boolean
    onPatchWorkflow: (patch: UpdateWorkflowInput) => Promise<Workflow | null>
    onPatchYaml: (configYaml: string) => Promise<Workflow | null>
    onPatchNotes: (notes: string) => Promise<Workflow | null>
  }>()

  let activeTab = $state<PanelTab>('code')
  let yamlDraft = $state('')
  let notesDraft = $state('')
  let isSavingYaml = $state(false)
  let isSavingNotes = $state(false)
  let isLoadingVersions = $state(false)
  let isSavingVersion = $state(false)
  let error = $state<string | null>(null)
  let versions = $state<WorkflowVersion[]>([])
  let lastWorkflowId = $state('')
  let loadedVersionsFor = $state('')

  const isDatabaseFlow = $derived(isDatabaseFlowDefinition(workflow.definition))
  const flowTypeDefinition = $derived(
    getWorkflowFlowTypeDefinition(workflow.definition.flowType)
  )
  const flowLabel = $derived(flowTypeDefinition.label)
  const panelTabs = $derived<PanelTabOption[]>([
    ...(isDatabaseFlow
      ? [{ id: 'schema' as PanelTab, label: 'Schema', icon: Table2 }]
      : []),
    { id: 'code' as PanelTab, label: 'Code', icon: CodeXml },
    { id: 'notepad' as PanelTab, label: 'Notepad', icon: NotebookPen },
    { id: 'versions' as PanelTab, label: 'Versions', icon: History }
  ])
  const panelTabsStyle = $derived(
    `grid-template-columns:repeat(${panelTabs.length},minmax(0,1fr))`
  )
  const activePanelTab = $derived(
    panelTabs.find((tab: PanelTabOption) => tab.id === activeTab) ??
      panelTabs[0]
  )

  $effect(() => {
    if (workflow.id !== lastWorkflowId) {
      versions = []
      loadedVersionsFor = ''
      lastWorkflowId = workflow.id
      activeTab = isDatabaseFlowDefinition(workflow.definition)
        ? 'schema'
        : 'code'
    }
    if (
      !isDatabaseFlowDefinition(workflow.definition) &&
      activeTab === 'schema'
    ) {
      activeTab = 'code'
    }
    yamlDraft = workflow.configYaml
    notesDraft = workflow.notes
  })

  $effect(() => {
    if (activeTab === 'versions') {
      void loadVersions()
    }
  })

  async function patchDefinition(definition: WorkflowDefinition) {
    await onPatchWorkflow({
      definition,
      configYaml: workflowDefinitionToYaml(definition)
    })
  }

  async function patchDatabaseDefinition(definition: DatabaseFlowDefinition) {
    if (!canModify) return
    error = null
    try {
      await patchDefinition(definition)
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Failed to save database schema.'
    }
  }

  async function saveYaml() {
    if (!canModify || isSavingYaml) return
    isSavingYaml = true
    error = null
    try {
      await onPatchYaml(yamlDraft)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Invalid workflow YAML.'
    } finally {
      isSavingYaml = false
    }
  }

  async function saveNotes() {
    if (!canModify || isSavingNotes) return
    isSavingNotes = true
    error = null
    try {
      await onPatchNotes(notesDraft)
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Failed to save workflow notes.'
    } finally {
      isSavingNotes = false
    }
  }

  async function loadVersions(force = false) {
    if (
      !canvasId ||
      !workflow.id ||
      (!force && loadedVersionsFor === workflow.id)
    ) {
      return
    }
    isLoadingVersions = true
    error = null
    try {
      const response = await listWorkflowVersions(canvasId, workflow.id)
      versions = response.items
      loadedVersionsFor = workflow.id
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : 'Failed to load workflow versions.'
    } finally {
      isLoadingVersions = false
    }
  }

  async function saveVersion() {
    if (!canModify || isSavingVersion) return
    isSavingVersion = true
    error = null
    try {
      await createWorkflowVersion(canvasId, workflow.id, {
        title: workflow.title
      })
      await loadVersions(true)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to save version.'
    } finally {
      isSavingVersion = false
    }
  }

  async function restoreVersion(version: WorkflowVersion) {
    if (!canModify) return
    error = null
    try {
      await onPatchWorkflow({
        definition: version.definition,
        configYaml: version.configYaml,
        notes: version.notes
      })
      activeTab = 'code'
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to restore version.'
    }
  }
</script>

<WorkflowDraggablePanel
  side="right"
  panelWidth={360}
  {fullscreen}
  ariaLabel={`${flowLabel} code and versions`}
  openLabel={activePanelTab.label}
>
  {#snippet launcher()}
    <activePanelTab.icon class="size-4 shrink-0 text-primary" />
  {/snippet}

  {#snippet header({ minimize, animating })}
    <div
      class="grid min-w-0 flex-1"
      style={panelTabsStyle}
      role="tablist"
      aria-label={`${flowLabel} panels`}
    >
      {#each panelTabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          class={`flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium ${
            activeTab === tab.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground'
          }`}
          onclick={() => (activeTab = tab.id)}
        >
          <tab.icon class="size-3.5" aria-hidden="true" />
          {tab.label}
        </button>
      {/each}
    </div>
    <button
      type="button"
      class="ml-1 mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={() => void minimize()}
      disabled={animating}
      aria-label={`Minimize ${activePanelTab.label} panel`}
      title={`Minimize ${activePanelTab.label} panel`}
    >
      <Minus class="size-4" aria-hidden="true" />
    </button>
  {/snippet}

  {#if error}
    <div
      class="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      role="alert"
    >
      {error}
    </div>
  {/if}

  {#if activeTab === 'schema' && isDatabaseFlowDefinition(workflow.definition)}
    <DatabaseSchemaPanel
      definition={workflow.definition}
      {canModify}
      onDefinitionChange={patchDatabaseDefinition}
    />
  {:else if activeTab === 'code'}
    <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <textarea
        bind:value={yamlDraft}
        spellcheck="false"
        aria-label="Workflow YAML configuration"
        class="min-h-0 flex-1 resize-none rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground"
        disabled={!canModify}
      ></textarea>
      <button
        type="button"
        class="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        onclick={saveYaml}
        disabled={!canModify || isSavingYaml}
      >
        {#if isSavingYaml}
          <LoaderCircle class="size-4 animate-spin" />
        {:else}
          <Save class="size-4" />
        {/if}
        Apply YAML
      </button>
    </div>
  {:else if activeTab === 'notepad'}
    <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <textarea
        bind:value={notesDraft}
        class="min-h-0 flex-1 resize-none rounded-md border border-input bg-background p-3 text-sm leading-relaxed text-foreground"
        placeholder="Workflow notes..."
        aria-label="Workflow notes"
        disabled={!canModify}
      ></textarea>
      <button
        type="button"
        class="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        onclick={saveNotes}
        disabled={!canModify || isSavingNotes}
      >
        {#if isSavingNotes}
          <LoaderCircle class="size-4 animate-spin" />
        {:else}
          <Save class="size-4" />
        {/if}
        Save notes
      </button>
    </div>
  {:else}
    <div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <button
        type="button"
        class="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        onclick={saveVersion}
        disabled={!canModify || isSavingVersion}
      >
        {#if isSavingVersion}
          <LoaderCircle class="size-4 animate-spin" />
        {:else}
          <Save class="size-4" />
        {/if}
        Save version
      </button>
      <div
        class="min-h-0 flex-1 overflow-auto rounded-md border border-border/70"
      >
        {#if isLoadingVersions}
          <div
            class="flex h-24 items-center justify-center text-xs text-muted-foreground"
          >
            <LoaderCircle class="mr-2 size-4 animate-spin" />
            Loading versions
          </div>
        {:else}
          {#each versions as version (version.id)}
            <div
              class="flex items-center gap-2 border-b border-border/70 px-3 py-2 text-xs last:border-b-0"
            >
              <FileText class="size-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-foreground">
                  {version.title || 'Workflow version'}
                </p>
                <p class="text-muted-foreground">
                  {new Date(version.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                class="size-7 rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                onclick={() => restoreVersion(version)}
                disabled={!canModify}
                aria-label="Restore version"
                title="Restore version"
              >
                <RotateCcw class="mx-auto size-3.5" />
              </button>
            </div>
          {:else}
            <div
              class="flex h-24 items-center justify-center text-xs text-muted-foreground"
            >
              No versions saved.
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</WorkflowDraggablePanel>
