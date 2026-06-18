<script lang="ts">
  import {
    Bot,
    Check,
    CodeXml,
    History,
    LoaderCircle,
    NotebookPen,
    Save
  } from 'lucide-svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  import { defaultModelId } from '$lib/scenes/models'
  import type { Scene } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import {
    createWorkflowVersion,
    listWorkflowVersions,
    requestWorkflowAssistant
  } from '$lib/workflows/api'
  import {
    workflowDefinitionFromYaml,
    workflowDefinitionToYaml
  } from '$lib/workflows/definition'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowProposal,
    WorkflowSettings,
    WorkflowVersion
  } from '$lib/workflows/schema'

  type SheetTab = 'overview' | 'code' | 'notes' | 'versions' | 'assistant'
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
    initialTab = 'overview',
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
    initialTab?: SheetTab
    onClose: () => void
    onPatchWorkflow: (patch: UpdateWorkflowInput) => Promise<Workflow | null>
    onPatchYaml: (configYaml: string) => Promise<Workflow | null>
    onPatchNotes: (notes: string) => Promise<Workflow | null>
    onPatchSettings: (settings: WorkflowSettings) => Promise<Workflow | null>
  }>()

  let activeTab = $state<SheetTab>('overview')
  let titleDraft = $state('')
  let yamlDraft = $state('')
  let notesDraft = $state('')
  let prompt = $state('')
  let error = $state<string | null>(null)
  let isSaving = $state(false)
  let isAsking = $state(false)
  let isLoadingVersions = $state(false)
  let isSavingVersion = $state(false)
  let versions = $state<WorkflowVersion[]>([])
  let loadedVersionsFor = $state('')
  let messages = $state<ChatEntry[]>([])
  let applyingProposalIds = $state<string[]>([])
  let appliedProposalIds = $state<string[]>([])

  const tabs = [
    { id: 'overview' as SheetTab, label: 'Info', icon: Save },
    { id: 'code' as SheetTab, label: 'Code', icon: CodeXml },
    { id: 'notes' as SheetTab, label: 'Notes', icon: NotebookPen },
    { id: 'versions' as SheetTab, label: 'Versions', icon: History },
    { id: 'assistant' as SheetTab, label: 'AI', icon: Bot }
  ]
  const canSend = $derived(canModify && !isAsking && prompt.trim().length > 0)

  $effect(() => {
    void workflow.id
    activeTab = initialTab
    titleDraft = workflow.title
    yamlDraft =
      workflow.configYaml || workflowDefinitionToYaml(workflow.definition)
    notesDraft = workflow.notes
    error = null
    if (loadedVersionsFor !== workflow.id) {
      versions = []
    }
  })

  $effect(() => {
    if (activeTab === 'versions') {
      void loadVersions()
    }
  })

  async function saveTitle() {
    const title = titleDraft.trim()
    if (!canModify || !title || title === workflow.title || isSaving) return
    isSaving = true
    error = null
    try {
      await onPatchWorkflow({ title })
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to save title.'
    } finally {
      isSaving = false
    }
  }

  async function saveYaml() {
    if (!canModify || isSaving) return
    isSaving = true
    error = null
    try {
      workflowDefinitionFromYaml(yamlDraft)
      await onPatchYaml(yamlDraft)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Invalid workflow YAML.'
    } finally {
      isSaving = false
    }
  }

  async function saveNotes() {
    if (!canModify || isSaving) return
    isSaving = true
    error = null
    try {
      await onPatchNotes(notesDraft)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to save notes.'
    } finally {
      isSaving = false
    }
  }

  async function loadVersions(force = false) {
    if (!force && loadedVersionsFor === workflow.id) return
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

  async function askAssistant() {
    const text = prompt.trim()
    if (!canSend || !text) return
    prompt = ''
    isAsking = true
    error = null
    messages = [...messages, { id: crypto.randomUUID(), role: 'user', text }]

    try {
      const response = await requestWorkflowAssistant({
        canvasId,
        workflowId: workflow.id,
        modelId: defaultModelId,
        prompt: text,
        workflow,
        context: workflow.settings.context
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

  async function applyProposal(messageId: string, proposal: WorkflowProposal) {
    if (applyingProposalIds.includes(messageId)) return
    applyingProposalIds = [...applyingProposalIds, messageId]
    error = null
    try {
      await onPatchWorkflow({
        definition: proposal.definition,
        configYaml: proposal.configYaml
      })
      appliedProposalIds = [...appliedProposalIds, messageId]
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to apply proposal.'
    } finally {
      applyingProposalIds = applyingProposalIds.filter((id) => id !== messageId)
    }
  }

  function handlePromptKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void askAssistant()
    }
  }
</script>

<div class="fixed inset-0 z-50" transition:fade={{ duration: 120 }}>
  <button
    type="button"
    class="absolute inset-0 bg-black/35"
    onclick={onClose}
    aria-label="Close workflow sheet"
  ></button>

  <div
    class="absolute inset-x-0 bottom-0 z-10 flex h-[94dvh] flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card text-card-foreground shadow-2xl"
    role="dialog"
    aria-label="Workflow editor"
    transition:fly={{ y: 36, duration: 180, easing: cubicOut }}
  >
    <header class="shrink-0 border-b border-border/60 px-4 pb-3 pt-2">
      <button
        type="button"
        class="mx-auto mb-3 block h-5 w-16 rounded-full"
        onclick={onClose}
        aria-label="Close workflow sheet"
      >
        <span class="mx-auto block h-1 w-10 rounded-full bg-muted-foreground/30"
        ></span>
      </button>
      <div class="flex rounded-full bg-muted/50 p-1">
        {#each tabs as tab (tab.id)}
          <button
            type="button"
            class={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            }`}
            onclick={() => (activeTab = tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            <tab.icon class="size-3.5" aria-hidden="true" />
            <span class="truncate">{tab.label}</span>
          </button>
        {/each}
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {#if activeTab === 'overview'}
        <div class="space-y-4">
          <label class="block">
            <span
              class="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              Title
            </span>
            <input
              class="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary"
              bind:value={titleDraft}
              disabled={!canModify}
            />
          </label>
          <button
            type="button"
            class="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            onclick={() => void saveTitle()}
            disabled={!canModify || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save title'}
          </button>
          <div class="rounded-xl border border-border/70 bg-background/70 p-3">
            <p
              class="text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              Context
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              {workflow.settings.context.sceneIds.length} scenes,
              {workflow.settings.context.documentIds.length} documents selected.
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {scenes.length} scenes and
              {scenes.flatMap((scene: Scene) =>
                sceneDocumentsStore.getItems(scene.id)
              ).length}
              saved/draft documents are available on this canvas.
            </p>
          </div>
        </div>
      {:else if activeTab === 'code'}
        <div class="space-y-3">
          <textarea
            class="min-h-[58dvh] w-full resize-none rounded-xl border border-border/70 bg-background p-3 font-mono text-xs leading-relaxed outline-none focus:border-primary"
            bind:value={yamlDraft}
            disabled={!canModify}
            aria-label="Workflow YAML"
          ></textarea>
          <button
            type="button"
            class="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            onclick={() => void saveYaml()}
            disabled={!canModify || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save YAML'}
          </button>
        </div>
      {:else if activeTab === 'notes'}
        <div class="space-y-3">
          <textarea
            class="min-h-[58dvh] w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary"
            bind:value={notesDraft}
            disabled={!canModify}
            aria-label="Workflow notes"
            placeholder="Workflow notes..."
          ></textarea>
          <button
            type="button"
            class="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            onclick={() => void saveNotes()}
            disabled={!canModify || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save notes'}
          </button>
        </div>
      {:else if activeTab === 'versions'}
        <div class="space-y-3">
          <button
            type="button"
            class="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            onclick={() => void saveVersion()}
            disabled={!canModify || isSavingVersion}
          >
            {isSavingVersion ? 'Saving...' : 'Save version'}
          </button>
          {#if isLoadingVersions}
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle class="size-4 animate-spin" />
              Loading versions...
            </div>
          {:else if versions.length === 0}
            <p class="text-sm text-muted-foreground">No versions saved yet.</p>
          {:else}
            <div class="space-y-2">
              {#each versions as version (version.id)}
                <div
                  class="rounded-xl border border-border/70 bg-background/70 p-3"
                >
                  <p class="truncate text-sm font-semibold">{version.title}</p>
                  <p class="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    class="mt-2 h-9 rounded-full border border-border/70 px-3 text-xs font-semibold disabled:opacity-50"
                    onclick={() => void restoreVersion(version)}
                    disabled={!canModify}
                  >
                    Restore
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <div class="flex min-h-full flex-col gap-3">
          <div class="min-h-0 flex-1 space-y-3">
            {#each messages as message (message.id)}
              <div
                class={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  class={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/70 bg-background/70'
                  }`}
                >
                  <p class="whitespace-pre-wrap">{message.text}</p>
                  {#if message.proposal}
                    <button
                      type="button"
                      class="mt-2 inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      onclick={() =>
                        void applyProposal(message.id, message.proposal!)}
                      disabled={applyingProposalIds.includes(message.id) ||
                        appliedProposalIds.includes(message.id)}
                    >
                      {#if appliedProposalIds.includes(message.id)}
                        <Check class="size-3" aria-hidden="true" />
                        Applied
                      {:else}
                        Apply proposal
                      {/if}
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
            {#if isAsking}
              <div
                class="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <LoaderCircle class="size-4 animate-spin" />
                Thinking...
              </div>
            {/if}
            {#if messages.length === 0 && !isAsking}
              <p class="py-8 text-center text-sm text-muted-foreground">
                Ask AI to revise this workflow for mobile.
              </p>
            {/if}
          </div>
          <div
            class="sticky bottom-0 -mx-4 border-t border-border/60 bg-card px-4 py-3"
          >
            <textarea
              class="mb-2 max-h-32 min-h-20 w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-sm outline-none focus:border-primary"
              bind:value={prompt}
              onkeydown={handlePromptKeydown}
              placeholder="Describe changes to make..."
              disabled={!canModify || isAsking}
            ></textarea>
            <button
              type="button"
              class="h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
              onclick={() => void askAssistant()}
              disabled={!canSend}
            >
              Ask AI
            </button>
          </div>
        </div>
      {/if}

      {#if error}
        <p
          class="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      {/if}
    </div>
  </div>
</div>
