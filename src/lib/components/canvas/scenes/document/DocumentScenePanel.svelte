<script lang="ts">
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import {
    Library,
    MessageSquare,
    NotebookPen,
    PanelLeftClose,
    PanelLeftOpen,
    PencilLine
  } from 'lucide-svelte'
  import type { UIMessage } from 'ai'
  import {
    createSceneDocument,
    deleteSceneDocument,
    listSceneDocuments,
    listSceneMessages,
    updateSceneDocument
  } from '$lib/scenes/api'
  import {
    markdownDocumentContentSchema,
    type Scene,
    type SceneDocument,
    type SceneMessage
  } from '$lib/scenes/schema'
  import { defaultModelId, isKnownModelId } from '$lib/scenes/models'
  import type { SceneActivity, SceneActivityKind } from '$lib/scenes/types'
  import type { DraftToolPart } from '$lib/scenes/chat-parts'
  import { toast } from '$lib/stores/toast.svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import DocumentChatPanel from '$lib/components/canvas/scenes/document/DocumentChatPanel.svelte'
  import DocumentComposer from '$lib/components/canvas/scenes/document/DocumentComposer.svelte'
  import DocumentEditorView from '$lib/components/canvas/scenes/document/DocumentEditorView.svelte'
  import DocumentLivePreview from '$lib/components/canvas/scenes/document/DocumentLivePreview.svelte'
  import DocumentListPanel from '$lib/components/canvas/scenes/document/DocumentListPanel.svelte'
  import NotesSceneView from '$lib/components/canvas/scenes/notes/NotesSceneView.svelte'

  let {
    canvasId,
    scene,
    userId,
    canModify,
    documentRevision,
    liveMessages,
    remoteActivity,
    remoteStreamingText,
    initialPrompt,
    onInitialPromptSent,
    onBroadcastActivity
  } = $props<{
    canvasId: string
    scene: Scene
    userId: string
    canModify: boolean
    documentRevision: number
    liveMessages: SceneMessage[]
    remoteActivity: SceneActivity | null
    remoteStreamingText: string
    initialPrompt: string | null
    onInitialPromptSent: () => void
    onBroadcastActivity: (kind: SceneActivityKind, textDelta?: string) => void
  }>()

  let documents = $state<SceneDocument[]>([])
  let activeDocumentId = $state<string | null>(null)
  let initialMessages = $state<UIMessage[] | null>(null)
  let view = $state<'chat' | 'editor' | 'notes'>('chat')
  let showLibrary = $state(true)
  // Collapse the chat to give the document section the full width.
  let chatCollapsed = $state(false)
  // svelte-ignore state_referenced_locally -- seeds picker state once on mount
  let modelId = $state(
    typeof scene.settings.modelId === 'string' && isKnownModelId(scene.settings.modelId)
      ? scene.settings.modelId
      : defaultModelId
  )
  let webSearch = $state(false)
  let contextDocumentIds = $state<string[]>([])
  let isSavingDocument = $state(false)
  let error = $state<string | null>(null)
  // The write_document call currently streaming, mirrored into the editor
  // pane so the document appears there live instead of in the chat.
  let liveDraft = $state<DraftToolPart | null>(null)
  let documentPendingDelete = $state<SceneDocument | null>(null)
  let confirmDeleteDocumentOpen = $state(false)
  let documentsLoaded = $state(false)
  // First prompt typed in the blank state — sent automatically once the
  // lazily-created draft's chat mounts.
  let localPendingPrompt = $state<string | null>(null)
  let creatingDraft = false

  const activeDocument = $derived(
    documents.find((document) => document.id === activeDocumentId) ?? null
  )
  const savedDocuments = $derived(documents.filter((document) => document.status === 'saved'))
  // Realtime chat messages for the active document's thread only.
  const liveMessagesForActiveDocument = $derived(
    liveMessages.filter((message: SceneMessage) => message.documentId === activeDocumentId)
  )

  function reportError(cause: unknown, fallback: string) {
    error = cause instanceof Error ? cause.message : fallback
  }

  function hasContent(document: SceneDocument) {
    if (document.title.trim() !== '') {
      return true
    }
    const parsed = markdownDocumentContentSchema.safeParse(document.content)
    return parsed.success && parsed.data.markdown.trim() !== ''
  }

  async function loadDocuments() {
    const response = await listSceneDocuments(canvasId, scene.id)
    // Notes live in their own view (kind 'notes'), not in the library.
    documents = response.items.filter((item) => item.kind === 'markdown')

    // Keep the current selection; otherwise pick the latest draft with
    // actual content. No auto-selection of empty drafts or saved docs —
    // a fresh open starts blank.
    if (!documents.some((document) => document.id === activeDocumentId)) {
      const draft = documents.find(
        (document) => document.status === 'draft' && hasContent(document)
      )
      activeDocumentId = draft?.id ?? null
    }

    contextDocumentIds = contextDocumentIds.filter((id) =>
      documents.some((document) => document.id === id && document.status === 'saved')
    )
  }

  // Drafts are created lazily: only when the first prompt is sent, never
  // on open — so a scene without work in progress starts blank.
  async function createBlankDraft() {
    if (creatingDraft) {
      return
    }
    creatingDraft = true
    try {
      const response = await createSceneDocument(canvasId, scene.id, {
        kind: 'markdown',
        status: 'draft',
        title: '',
        content: {}
      })
      documents = [response.item, ...documents]
      activeDocumentId = response.item.id
    } finally {
      creatingDraft = false
    }
  }

  onMount(() => {
    void (async () => {
      try {
        await loadDocuments()
      } catch (cause) {
        reportError(cause, 'Failed to load the document workspace.')
      } finally {
        documentsLoaded = true
      }
    })()
  })

  // A prompt arriving from the blank-scene entry screen needs a draft to
  // chat against — create it once documents have loaded.
  $effect(() => {
    if (documentsLoaded && initialPrompt && !activeDocumentId && canModify) {
      void createBlankDraft().catch((cause) => reportError(cause, 'Failed to create a draft.'))
    }
  })

  function handleBlankSend(text: string) {
    localPendingPrompt = text
    void createBlankDraft().catch((cause) => reportError(cause, 'Failed to create a draft.'))
  }

  // Each document keeps its own chat thread: (re)load history whenever the
  // active document changes; the chat panel below is keyed on it.
  let loadedMessagesForDocumentId: string | null = null

  $effect(() => {
    const documentId = activeDocumentId
    if (!documentId) {
      initialMessages = null
      loadedMessagesForDocumentId = null
      return
    }
    if (loadedMessagesForDocumentId === documentId) {
      return
    }

    loadedMessagesForDocumentId = documentId
    initialMessages = null
    // The chat panel remounts for the new thread; drop any stale preview.
    liveDraft = null

    void (async () => {
      try {
        const history = await listSceneMessages(canvasId, scene.id, documentId)
        if (activeDocumentId !== documentId) {
          return
        }
        initialMessages = history.items.map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts
        })) as unknown as UIMessage[]
      } catch (cause) {
        reportError(cause, 'Failed to load the conversation.')
      }
    })()
  })

  // Realtime document events from other collaborators are refetch signals.
  $effect(() => {
    if (documentRevision > 0) {
      void loadDocuments().catch((cause) => reportError(cause, 'Failed to refresh documents.'))
    }
  })

  function buildBody() {
    return {
      canvasId,
      sceneId: scene.id,
      documentId: activeDocumentId,
      contextDocumentIds,
      modelId,
      category: typeof scene.settings.category === 'string' ? scene.settings.category : 'doc-md',
      webSearch
    }
  }

  function toggleContext(documentId: string) {
    contextDocumentIds = contextDocumentIds.includes(documentId)
      ? contextDocumentIds.filter((id) => id !== documentId)
      : [...contextDocumentIds, documentId]
  }

  // "New draft" switches to the blank state; the row is created when the
  // first prompt is sent.
  function handleNewDraft() {
    activeDocumentId = null
    localPendingPrompt = null
    view = 'chat'
  }

  async function handlePromote(documentId: string) {
    const title = documents.find((doc) => doc.id === documentId)?.title
    try {
      await updateSceneDocument(canvasId, scene.id, documentId, {
        status: 'saved'
      })
      await loadDocuments()
      toast.show({
        title: 'Saved to library',
        description: title || 'Untitled document'
      })
    } catch (cause) {
      reportError(cause, 'Failed to save the document.')
    }
  }

  function requestDeleteDocument(documentId: string) {
    documentPendingDelete = documents.find((doc) => doc.id === documentId) ?? null
    confirmDeleteDocumentOpen = documentPendingDelete !== null
  }

  async function handleDeleteDocumentConfirmed() {
    const pending = documentPendingDelete
    documentPendingDelete = null
    if (!pending) {
      return
    }

    try {
      await deleteSceneDocument(canvasId, scene.id, pending.id)
      await loadDocuments()
      toast.show({
        title: 'Document deleted',
        description: pending.title || 'Untitled document'
      })
    } catch (cause) {
      reportError(cause, 'Failed to delete the document.')
    }
  }

  async function handleSaveDocument(title: string, markdown: string) {
    if (!activeDocument) {
      return
    }

    isSavingDocument = true
    try {
      const parsed = markdownDocumentContentSchema.safeParse(activeDocument.content)
      await updateSceneDocument(canvasId, scene.id, activeDocument.id, {
        title,
        content: {
          docType: parsed.success ? parsed.data.docType : undefined,
          markdown,
          // Manual saves replace the markdown but keep the notes layer.
          ...(parsed.success && parsed.data.annotations
            ? { annotations: parsed.data.annotations }
            : null)
        }
      })
      await loadDocuments()
    } catch (cause) {
      reportError(cause, 'Failed to save the document.')
    } finally {
      isSavingDocument = false
    }
  }

  function handleTurnFinished() {
    void loadDocuments().catch((cause) => reportError(cause, 'Failed to refresh documents.'))
  }

  // The document section only exists once there is something to show — a
  // streaming draft, an active document, or the notes view.
  const showWorkPane = $derived(liveDraft !== null || activeDocument !== null)

  $effect(() => {
    if (!showWorkPane && chatCollapsed) {
      chatCollapsed = false
    }
    if (view === 'notes' && !activeDocument) {
      view = 'chat'
    }
  })
</script>

<div class="flex h-full min-h-0">
  {#if showLibrary}
    <aside class="hidden w-60 shrink-0 border-r border-border/50 md:block">
      <DocumentListPanel
        {documents}
        {activeDocumentId}
        {canModify}
        onSelect={(id) => (activeDocumentId = id)}
        onNewDraft={handleNewDraft}
        onPromote={(id) => void handlePromote(id)}
        onDelete={requestDeleteDocument}
      />
    </aside>
  {/if}

  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <div class="flex items-center gap-1 border-b border-border/50 px-5 py-2">
      <button
        type="button"
        class={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition ${
          showLibrary ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        onclick={() => (showLibrary = !showLibrary)}
        title="Toggle document library"
      >
        <Library class="size-3.5" />
        Library
      </button>
      <!-- Chat/editor toggles only matter below md; at md+ both panes show side by side. -->
      <button
        type="button"
        class={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition md:hidden ${
          view === 'chat'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onclick={() => (view = 'chat')}
      >
        <MessageSquare class="size-3.5" />
        AI chat
      </button>
      <button
        type="button"
        class={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition disabled:opacity-40 md:hidden ${
          view === 'editor'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onclick={() => (view = 'editor')}
        disabled={!activeDocument}
      >
        <PencilLine class="size-3.5" />
        Editor
      </button>
      <button
        type="button"
        class={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition disabled:opacity-40 ${
          view === 'notes'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onclick={() => (view = view === 'notes' ? 'chat' : 'notes')}
        disabled={!activeDocument}
        title="Draw, underline, and highlight on this document"
        aria-pressed={view === 'notes'}
      >
        <NotebookPen class="size-3.5" />
        Notes
      </button>
      <button
        type="button"
        class="hidden h-7 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40 md:flex"
        onclick={() => (chatCollapsed = !chatCollapsed)}
        disabled={!showWorkPane}
        title={chatCollapsed ? 'Show the AI chat' : 'Hide the AI chat'}
        aria-pressed={chatCollapsed}
      >
        {#if chatCollapsed}
          <PanelLeftOpen class="size-3.5" />
          Show chat
        {:else}
          <PanelLeftClose class="size-3.5" />
          Hide chat
        {/if}
      </button>

      {#if activeDocument}
        <span class="ml-auto truncate text-xs text-muted-foreground">
          Working on: {activeDocument.title || 'Untitled draft'}
        </span>
      {/if}
    </div>

    {#if error}
      <div
        class="mx-5 mt-2 flex items-center justify-between rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600"
      >
        <span>{error}</span>
        <button type="button" class="font-medium underline" onclick={() => (error = null)}>
          Dismiss
        </button>
      </div>
    {/if}

    <!-- Side-by-side at md+: chat (actions/narration) on the left, the
         document section on the right where AI output streams in. The chat
         stays mounted (CSS hiding only) so a running stream survives
         toggling; the document section only exists once there is content,
         and slides in when it appears. -->
    <div class="flex min-h-0 flex-1">
      <div
        class={`${view === 'chat' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col ${
          chatCollapsed ? 'md:hidden' : 'md:flex'
        }`}
      >
        {#if initialMessages !== null && activeDocumentId}
          {#key activeDocumentId}
            <DocumentChatPanel
              {initialMessages}
              {buildBody}
              {canModify}
              canSend={activeDocumentId !== null}
              liveMessages={liveMessagesForActiveDocument}
              {remoteActivity}
              {remoteStreamingText}
              initialPrompt={initialPrompt ?? localPendingPrompt}
              onInitialPromptSent={() => {
                onInitialPromptSent()
                localPendingPrompt = null
              }}
              {onBroadcastActivity}
              onTurnFinished={handleTurnFinished}
              onLiveDraftChange={(draft) => (liveDraft = draft)}
              {modelId}
              onModelChange={(next) => (modelId = next)}
              {webSearch}
              onWebSearchToggle={() => (webSearch = !webSearch)}
              {savedDocuments}
              {contextDocumentIds}
              onToggleContext={toggleContext}
            />
          {/key}
        {:else if documentsLoaded && !activeDocumentId}
          <!-- Blank state, centered like the scene entry screen: no draft
               exists yet — it's created on first send. -->
          <div class="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div class="text-center">
              <h3 class="text-lg font-semibold text-foreground">What do you want to draft?</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Describe the document, or pick one from the library.
              </p>
            </div>
            <div class="w-full max-w-xl">
              <DocumentComposer
                floating
                disabled={!canModify}
                isStreaming={false}
                {modelId}
                onModelChange={(next) => (modelId = next)}
                {webSearch}
                onWebSearchToggle={() => (webSearch = !webSearch)}
                {savedDocuments}
                {contextDocumentIds}
                onToggleContext={toggleContext}
                onSend={handleBlankSend}
              />
            </div>
          </div>
        {:else}
          <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading conversation…
          </div>
        {/if}
      </div>

      {#if showWorkPane}
        <div
          transition:slide={{ axis: 'x', duration: 280 }}
          class={`${view !== 'chat' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col md:flex ${
            chatCollapsed ? '' : 'md:w-[44%] md:flex-none md:border-l md:border-border/50'
          }`}
        >
          {#if view === 'notes' && activeDocument}
            {#key activeDocument.id}
              <NotesSceneView
                {canvasId}
                sceneId={scene.id}
                document={activeDocument}
                {userId}
                {canModify}
                {onBroadcastActivity}
              />
            {/key}
          {:else if liveDraft}
            <DocumentLivePreview title={liveDraft.title} content={liveDraft.content} />
          {:else if activeDocument}
            {#key `${activeDocument.id}:${activeDocument.updatedAt}`}
              <DocumentEditorView
                document={activeDocument}
                {canModify}
                isSaving={isSavingDocument}
                onSave={(title, markdown) => void handleSaveDocument(title, markdown)}
                onPromote={() => activeDocument && void handlePromote(activeDocument.id)}
                onBack={() => (view = 'chat')}
              />
            {/key}
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<ConfirmDialog
  bind:open={confirmDeleteDocumentOpen}
  title="Delete document?"
  message={`“${documentPendingDelete?.title || 'Untitled document'}” will be permanently deleted.`}
  confirmLabel="Delete document"
  onConfirm={() => void handleDeleteDocumentConfirmed()}
/>
