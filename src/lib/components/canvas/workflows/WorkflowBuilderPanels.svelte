<script lang="ts">
  import {
    Bot,
    Check,
    ClipboardList,
    Code2,
    FileText,
    History,
    Loader2,
    MessageSquare,
    NotebookPen,
    RotateCcw,
    Save,
    X
  } from 'lucide-svelte'
  import { defaultModelId, modelOptions } from '$lib/scenes/models'
  import type { Scene, SceneDocumentListItem } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import {
    createWorkflowVersion,
    listWorkflowVersions,
    requestWorkflowAssistant
  } from '$lib/workflows/api'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowContextSettings,
    WorkflowProposal,
    WorkflowSettings,
    WorkflowVersion
  } from '$lib/workflows/schema'

  type ChatEntry = {
    id: string
    role: 'user' | 'assistant'
    text: string
    proposal?: WorkflowProposal | null
  }

  let {
    canvasId,
    workflow,
    scenes,
    sceneDocumentsStore,
    canModify,
    onClose,
    onPatchWorkflow,
    onPatchYaml,
    onPatchNotes,
    onPatchSettings
  } = $props<{
    canvasId: string
    workflow: Workflow
    scenes: Scene[]
    sceneDocumentsStore: SceneDocumentsStore
    canModify: boolean
    onClose: () => void
    onPatchWorkflow: (patch: UpdateWorkflowInput) => Promise<Workflow | null>
    onPatchYaml: (configYaml: string) => Promise<Workflow | null>
    onPatchNotes: (notes: string) => Promise<Workflow | null>
    onPatchSettings: (settings: WorkflowSettings) => Promise<Workflow | null>
  }>()

  let activeTab = $state<'code' | 'notepad' | 'versions'>('code')
  let yamlDraft = $state('')
  let notesDraft = $state('')
  let prompt = $state('')
  let modelId = $state(defaultModelId)
  let isAsking = $state(false)
  let isSavingYaml = $state(false)
  let isSavingNotes = $state(false)
  let isLoadingVersions = $state(false)
  let isSavingVersion = $state(false)
  let error = $state<string | null>(null)
  let messages = $state<ChatEntry[]>([])
  let versions = $state<WorkflowVersion[]>([])
  let lastWorkflowId = $state('')
  let loadedVersionsFor = $state('')

  const context = $derived(workflow.settings.context)
  const savedDocuments = $derived.by(() =>
    scenes.flatMap((scene: Scene) =>
      sceneDocumentsStore
        .getItems(scene.id)
        .filter(
          (document: SceneDocumentListItem) => document.status === 'saved'
        )
        .map((document: SceneDocumentListItem) => ({
          ...document,
          sceneTitle: scene.title
        }))
    )
  )

  $effect(() => {
    if (workflow.id !== lastWorkflowId) {
      messages = []
      versions = []
      loadedVersionsFor = ''
      lastWorkflowId = workflow.id
    }
    yamlDraft = workflow.configYaml
    notesDraft = workflow.notes
  })

  function updateContext(next: WorkflowContextSettings) {
    void onPatchSettings({
      ...workflow.settings,
      context: next
    })
  }

  function toggleDocument(documentId: string) {
    if (!canModify) return
    const documentIds = context.documentIds.includes(documentId)
      ? context.documentIds.filter((id: string) => id !== documentId)
      : [...context.documentIds, documentId]
    updateContext({ ...context, documentIds })
  }

  function toggleScene(sceneId: string) {
    if (!canModify) return
    const sceneIds = context.sceneIds.includes(sceneId)
      ? context.sceneIds.filter((id: string) => id !== sceneId)
      : [...context.sceneIds, sceneId]
    updateContext({ ...context, sceneIds })
  }

  async function askAssistant() {
    if (!prompt.trim() || isAsking) return
    const text = prompt.trim()
    prompt = ''
    error = null
    isAsking = true
    const userMessage: ChatEntry = {
      id: crypto.randomUUID(),
      role: 'user',
      text
    }
    messages = [...messages, userMessage]

    try {
      const response = await requestWorkflowAssistant({
        canvasId,
        workflowId: workflow.id,
        modelId,
        prompt: text,
        workflow,
        context
      })
      messages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.message,
          proposal: response.proposal
        }
      ]
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to ask workflow AI.'
    } finally {
      isAsking = false
    }
  }

  async function applyProposal(proposal: WorkflowProposal) {
    error = null
    try {
      await onPatchWorkflow({
        definition: proposal.definition,
        configYaml: proposal.configYaml
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to apply proposal.'
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

  $effect(() => {
    if (activeTab === 'versions') {
      void loadVersions()
    }
  })
</script>

<div
  class="pointer-events-auto fixed top-20 bottom-24 left-4 z-30 flex w-[300px] flex-col overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-xl backdrop-blur"
  role="dialog"
  aria-label="Workflow AI builder"
  tabindex="-1"
  onpointerdown={(event) => event.stopPropagation()}
  onkeydown={(event) => event.stopPropagation()}
>
  <div class="flex items-center gap-2 border-b border-border/70 px-3 py-2">
    <Bot class="size-4 text-primary" />
    <span class="min-w-0 flex-1 truncate text-sm font-semibold"
      >Workflow AI</span
    >
    <button
      type="button"
      class="size-7 rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={onClose}
      aria-label="Close workflow builder"
      title="Close workflow builder"
    >
      <X class="mx-auto size-4" />
    </button>
  </div>

  <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
    <label class="grid gap-1 text-xs font-medium text-muted-foreground">
      Model
      <select
        bind:value={modelId}
        class="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
      >
        {#each modelOptions as model (model.id)}
          <option value={model.id}>{model.label}</option>
        {/each}
      </select>
    </label>

    <section class="grid gap-2">
      <div
        class="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
      >
        <ClipboardList class="size-3.5" />
        Context
      </div>
      <label class="flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={context.includeLinkedScenes}
          disabled={!canModify}
          onchange={(event) =>
            updateContext({
              ...context,
              includeLinkedScenes: event.currentTarget.checked
            })}
        />
        Include linked scenes
      </label>
      <div
        class="grid max-h-28 gap-1 overflow-auto rounded-md border border-border/70 p-2"
      >
        {#each scenes as scene (scene.id)}
          <label class="flex min-w-0 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={context.sceneIds.includes(scene.id)}
              disabled={!canModify}
              onchange={() => toggleScene(scene.id)}
            />
            <span class="min-w-0 truncate">{scene.title || 'Scene'}</span>
          </label>
        {:else}
          <p class="text-xs text-muted-foreground">No scenes available.</p>
        {/each}
      </div>
      <div
        class="grid max-h-32 gap-1 overflow-auto rounded-md border border-border/70 p-2"
      >
        {#each savedDocuments as document (document.id)}
          <label class="flex min-w-0 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={context.documentIds.includes(document.id)}
              disabled={!canModify}
              onchange={() => toggleDocument(document.id)}
            />
            <span class="min-w-0 flex-1 truncate"
              >{document.title || 'Untitled'}</span
            >
          </label>
        {:else}
          <p class="text-xs text-muted-foreground">No saved documents.</p>
        {/each}
      </div>
    </section>

    <div
      class="flex min-h-[120px] flex-1 flex-col gap-2 overflow-auto rounded-md border border-border/70 bg-background/60 p-2"
    >
      {#each messages as message (message.id)}
        <div
          class={`rounded-md px-2 py-1.5 text-xs ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <p class="whitespace-pre-wrap">{message.text}</p>
          {#if message.proposal}
            <button
              type="button"
              class="mt-2 flex h-7 items-center gap-1.5 rounded bg-background px-2 text-xs font-medium text-foreground hover:bg-background/80"
              onclick={() =>
                applyProposal(message.proposal as WorkflowProposal)}
              disabled={!canModify}
            >
              <Check class="size-3.5" />
              Apply proposal
            </button>
          {/if}
        </div>
      {:else}
        <div
          class="flex h-full items-center justify-center text-xs text-muted-foreground"
        >
          <MessageSquare class="mr-2 size-4" />
          Ask for a workflow proposal.
        </div>
      {/each}
    </div>

    <textarea
      bind:value={prompt}
      class="min-h-20 resize-none rounded-md border border-input bg-background p-2 text-sm text-foreground"
      placeholder="Describe the workflow tree to build..."
      disabled={!canModify || isAsking}
    ></textarea>
    <button
      type="button"
      class="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      onclick={askAssistant}
      disabled={!canModify || isAsking || !prompt.trim()}
    >
      {#if isAsking}
        <Loader2 class="size-4 animate-spin" />
      {:else}
        <Bot class="size-4" />
      {/if}
      Ask
    </button>
  </div>
</div>

<div
  class="pointer-events-auto fixed top-20 right-4 bottom-24 z-30 flex w-[360px] flex-col overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-xl backdrop-blur"
  role="dialog"
  aria-label="Workflow code and versions"
  tabindex="-1"
  onpointerdown={(event) => event.stopPropagation()}
  onkeydown={(event) => event.stopPropagation()}
>
  <div class="grid grid-cols-3 border-b border-border/70 p-1">
    <button
      type="button"
      class={`flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium ${
        activeTab === 'code'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground'
      }`}
      onclick={() => (activeTab = 'code')}
    >
      <Code2 class="size-3.5" />
      Code
    </button>
    <button
      type="button"
      class={`flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium ${
        activeTab === 'notepad'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground'
      }`}
      onclick={() => (activeTab = 'notepad')}
    >
      <NotebookPen class="size-3.5" />
      Notepad
    </button>
    <button
      type="button"
      class={`flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium ${
        activeTab === 'versions'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground'
      }`}
      onclick={() => (activeTab = 'versions')}
    >
      <History class="size-3.5" />
      Versions
    </button>
  </div>

  {#if error}
    <div
      class="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
    >
      {error}
    </div>
  {/if}

  {#if activeTab === 'code'}
    <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <textarea
        bind:value={yamlDraft}
        spellcheck="false"
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
          <Loader2 class="size-4 animate-spin" />
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
        disabled={!canModify}
      ></textarea>
      <button
        type="button"
        class="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        onclick={saveNotes}
        disabled={!canModify || isSavingNotes}
      >
        {#if isSavingNotes}
          <Loader2 class="size-4 animate-spin" />
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
          <Loader2 class="size-4 animate-spin" />
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
            <Loader2 class="mr-2 size-4 animate-spin" />
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
</div>
