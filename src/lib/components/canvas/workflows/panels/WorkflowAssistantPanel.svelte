<script lang="ts">
  import {
    ArrowUp,
    Bot,
    Check,
    Database,
    LoaderCircle,
    MessageSquare,
    Minus
  } from 'lucide-svelte'
  import { defaultModelId } from '$lib/scenes/models'
  import type { Scene, SceneDocumentListItem } from '$lib/scenes/schema'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import { requestWorkflowAssistant } from '$lib/workflows/api'
  import { isDatabaseFlowDefinition } from '$lib/workflows/database/definition'
  import { getWorkflowFlowTypeDefinition } from '$lib/workflows/flow-types'
  import ModelPicker from '$lib/components/canvas/scenes/document/ModelPicker.svelte'
  import WorkflowContextPicker from '$lib/components/canvas/workflows/panels/WorkflowContextPicker.svelte'
  import WorkflowDraggablePanel from '$lib/components/canvas/workflows/panels/WorkflowDraggablePanel.svelte'
  import type {
    UpdateWorkflowInput,
    Workflow,
    WorkflowContextSettings,
    WorkflowProposal,
    WorkflowSettings
  } from '$lib/workflows/schema'

  type ChatEntry = {
    id: string
    role: 'user' | 'assistant'
    text: string
    proposal?: WorkflowProposal | null
    streaming?: boolean
  }

  const APPLIED_RESPONSE_STREAM_DELAY_MS = 14

  let {
    canvasId,
    workflow,
    scenes,
    sceneDocumentsStore,
    canModify,
    fullscreen = false,
    onPatchWorkflow,
    onPatchSettings
  } = $props<{
    canvasId: string
    workflow: Workflow
    scenes: Scene[]
    sceneDocumentsStore: SceneDocumentsStore
    canModify: boolean
    fullscreen?: boolean
    onPatchWorkflow: (patch: UpdateWorkflowInput) => Promise<Workflow | null>
    onPatchSettings: (settings: WorkflowSettings) => Promise<Workflow | null>
  }>()

  let prompt = $state('')
  let textareaEl = $state<HTMLTextAreaElement | null>(null)
  let modelId = $state(defaultModelId)
  let isAsking = $state(false)
  let error = $state<string | null>(null)
  let messages = $state<ChatEntry[]>([])
  let applyingProposalIds = $state<string[]>([])
  let appliedProposalIds = $state<string[]>([])
  let lastWorkflowId = $state('')

  const context = $derived(workflow.settings.context)
  const isDatabaseFlow = $derived(isDatabaseFlowDefinition(workflow.definition))
  const flowTypeDefinition = $derived(
    getWorkflowFlowTypeDefinition(workflow.definition.flowType)
  )
  const flowLabel = $derived(flowTypeDefinition.label)
  const aiPromptPlaceholder = $derived(
    flowTypeDefinition.assistant.promptPlaceholder
  )
  const aiPromptSubject = $derived(flowTypeDefinition.assistant.promptSubject)
  const canSend = $derived(canModify && !isAsking && prompt.trim().length > 0)
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
      applyingProposalIds = []
      appliedProposalIds = []
      lastWorkflowId = workflow.id
    }
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

  function autogrow() {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 160)}px`
  }

  function send() {
    if (!canSend) return
    const text = prompt.trim()
    prompt = ''
    if (textareaEl) {
      textareaEl.style.height = 'auto'
    }
    void askAssistant(text)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  async function askAssistant(text: string) {
    if (!text || isAsking) return
    error = null
    isAsking = true
    messages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        text
      }
    ]

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

  async function applyProposal(messageId: string, proposal: WorkflowProposal) {
    if (
      applyingProposalIds.includes(messageId) ||
      appliedProposalIds.includes(messageId)
    ) {
      return
    }

    error = null
    applyingProposalIds = [...applyingProposalIds, messageId]
    try {
      await onPatchWorkflow({
        definition: proposal.definition,
        configYaml: proposal.configYaml
      })
      if (!appliedProposalIds.includes(messageId)) {
        appliedProposalIds = [...appliedProposalIds, messageId]
      }
      void streamAppliedResponse(buildAppliedProposalMessage(proposal))
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to apply proposal.'
    } finally {
      applyingProposalIds = applyingProposalIds.filter((id) => id !== messageId)
    }
  }

  function buildAppliedProposalMessage(proposal: WorkflowProposal) {
    const definition = proposal.definition
    if (isDatabaseFlowDefinition(definition)) {
      const tableCount = definition.tables.length
      const columnCount = definition.tables.reduce(
        (count, table) => count + table.columns.length,
        0
      )
      const relationCount = definition.relations.length
      return `Applied ${definition.name}: updated ${plural(tableCount, 'table')}, ${plural(columnCount, 'column')}, and ${plural(relationCount, 'relation')}. The schema diagram and YAML are now in sync.`
    }

    const stepCount = definition.steps.length
    const dependencyCount = definition.steps.reduce(
      (count, step) => count + step.needs.length,
      0
    )
    return `Applied ${definition.name}: updated ${plural(stepCount, 'step')} and ${plural(dependencyCount, 'connection')}. The workflow diagram and YAML are now in sync.`
  }

  function plural(count: number, singular: string) {
    return `${count} ${count === 1 ? singular : `${singular}s`}`
  }

  async function streamAppliedResponse(text: string) {
    const messageId = crypto.randomUUID()
    messages = [
      ...messages,
      {
        id: messageId,
        role: 'assistant',
        text: '',
        streaming: true
      }
    ]

    for (const character of text) {
      await wait(APPLIED_RESPONSE_STREAM_DELAY_MS)
      const messageIndex = messages.findIndex(
        (message) => message.id === messageId
      )
      if (messageIndex === -1) return

      const nextMessages = [...messages]
      const message = nextMessages[messageIndex]
      nextMessages[messageIndex] = {
        ...message,
        text: `${message.text}${character}`
      }
      messages = nextMessages
    }

    messages = messages.map((message) =>
      message.id === messageId ? { ...message, streaming: false } : message
    )
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
</script>

<WorkflowDraggablePanel
  side="left"
  panelWidth={300}
  {fullscreen}
  ariaLabel="Workflow AI builder"
  openLabel={`${flowLabel} AI`}
>
  {#snippet launcher()}
    {#if isDatabaseFlow}
      <Database class="size-4 shrink-0 text-primary" />
    {:else}
      <Bot class="size-4 shrink-0 text-primary" />
    {/if}
  {/snippet}

  {#snippet header({ minimize, animating })}
    <div class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
      {#if isDatabaseFlow}
        <Database class="size-4 text-primary" />
      {:else}
        <Bot class="size-4 text-primary" />
      {/if}
      <span class="min-w-0 flex-1 truncate text-sm font-semibold">
        {flowLabel} AI
      </span>
    </div>
    <button
      type="button"
      class="mr-3 flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={() => void minimize()}
      disabled={animating}
      aria-label="Minimize workflow AI panel"
      title="Minimize workflow AI panel"
    >
      <Minus class="size-4" aria-hidden="true" />
    </button>
  {/snippet}

  <div class="flex min-h-0 flex-1 flex-col">
    {#if error}
      <div
        class="m-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        role="alert"
      >
        {error}
      </div>
    {/if}

    <div
      class="m-3 mb-0 flex min-h-[120px] flex-1 flex-col gap-2 overflow-auto rounded-md border border-border/70 bg-background/60 p-2"
    >
      {#each messages as message (message.id)}
        {@const proposalApplying = applyingProposalIds.includes(message.id)}
        {@const proposalApplied = appliedProposalIds.includes(message.id)}
        <div
          class={`rounded-md px-2 py-1.5 text-xs ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <p class="whitespace-pre-wrap">
            {message.text}
            {#if message.streaming}
              <span
                class="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-[-1px]"
                aria-hidden="true"
              ></span>
            {/if}
          </p>
          {#if message.proposal}
            <button
              type="button"
              class={`mt-2 flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition ${
                proposalApplied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-background text-foreground hover:bg-background/80'
              }`}
              onclick={() =>
                applyProposal(message.id, message.proposal as WorkflowProposal)}
              disabled={!canModify || proposalApplying || proposalApplied}
            >
              {#if proposalApplying}
                <LoaderCircle class="size-3.5 animate-spin" />
              {:else}
                <Check class="size-3.5" />
              {/if}
              {#if proposalApplied}
                Applied
              {:else if proposalApplying}
                Applying
              {:else}
                Apply proposal
              {/if}
            </button>
          {/if}
        </div>
      {:else}
        <div
          class="flex h-full items-center justify-center text-xs text-muted-foreground"
        >
          <MessageSquare class="mr-2 size-4" />
          Ask for a {aiPromptSubject} proposal.
        </div>
      {/each}
    </div>

    <div class="border-t border-border/50 p-2">
      <div class="surface-card flex flex-col gap-1.5 rounded-xl p-2">
        <textarea
          bind:this={textareaEl}
          bind:value={prompt}
          oninput={autogrow}
          onkeydown={handleKeydown}
          rows="1"
          class="max-h-24 min-h-5 w-full resize-none bg-transparent text-xs leading-5 outline-none"
          placeholder={aiPromptPlaceholder}
          aria-label={`Describe the ${aiPromptSubject} to build`}
          disabled={!canModify || isAsking}
        ></textarea>

        <div class="flex items-center justify-between gap-1.5">
          <div class="flex min-w-0 flex-1 items-center gap-1">
            <ModelPicker
              {modelId}
              onModelChange={(next) => (modelId = next)}
              disabled={!canModify || isAsking}
              side="top"
              compact
            />
            <WorkflowContextPicker
              {scenes}
              {savedDocuments}
              includeLinkedScenes={context.includeLinkedScenes}
              selectedSceneIds={context.sceneIds}
              selectedDocumentIds={context.documentIds}
              disabled={!canModify || isAsking}
              side="top"
              compact
              onIncludeLinkedScenesChange={(checked) =>
                updateContext({ ...context, includeLinkedScenes: checked })}
              onToggleScene={toggleScene}
              onToggleDocument={toggleDocument}
            />
          </div>

          <button
            type="button"
            class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
            onclick={send}
            disabled={!canSend}
            aria-label="Ask workflow AI"
          >
            {#if isAsking}
              <LoaderCircle class="size-4 animate-spin" />
            {:else}
              <ArrowUp class="size-4" aria-hidden="true" />
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
</WorkflowDraggablePanel>
