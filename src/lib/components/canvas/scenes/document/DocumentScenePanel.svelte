<script lang="ts">
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import {
    MessageSquare,
    NotebookPen,
    PanelLeft,
    PanelLeftClose,
    PanelLeftOpen,
    PencilLine
  } from 'lucide-svelte'
  import type { UIMessage } from 'ai'
  import {
    createSceneDocument,
    deleteSceneDocument,
    listSceneMessages,
    updateSceneDocument
  } from '$lib/scenes/api'
  import { reconcileActiveDocumentId } from '$lib/scenes/document-selection'
  import {
    markdownDocumentContentSchema,
    type Scene,
    type SceneDocumentListItem,
    type SceneMessage
  } from '$lib/scenes/schema'
  import { defaultModelId, isKnownModelId } from '$lib/scenes/models'
  import type { SceneActivity, SceneActivityKind } from '$lib/scenes/types'
  import type { DraftToolPart } from '$lib/scenes/chat-parts'
  import { toast } from '$lib/stores/toast.svelte'
  import { useSceneDocumentsStore } from '$lib/stores/canvas/scenes/documents.svelte'
  import ConfirmDialog from '$lib/components/shared/ConfirmDialog.svelte'
  import DocumentChatPanel from '$lib/components/canvas/scenes/document/DocumentChatPanel.svelte'
  import DocumentComposer from '$lib/components/canvas/scenes/document/DocumentComposer.svelte'
  import DocumentEditorView from '$lib/components/canvas/scenes/document/DocumentEditorView.svelte'
  import DocumentLivePreview from '$lib/components/canvas/scenes/document/DocumentLivePreview.svelte'
  import DocumentListPanel from '$lib/components/canvas/scenes/document/DocumentListPanel.svelte'
  import NotesSceneView from '$lib/components/canvas/scenes/notes/NotesSceneView.svelte'

  // Module-level cache so reopening a document's chat thread mounts
  // instantly; fresh data still loads in the background for the next mount.
  const messagesCache = new Map<string, UIMessage[]>()

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

  // svelte-ignore state_referenced_locally -- route usage provides context;
  // this fallback only supports isolated component renders/tests.
  const sceneDocuments = useSceneDocumentsStore({
    canvasId,
    initialItemsBySceneId: {}
  })

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
  let documentPendingDelete = $state<SceneDocumentListItem | null>(null)
  let confirmDeleteDocumentOpen = $state(false)
  // First prompt typed in the blank state — sent automatically once the
  // lazily-created draft's chat mounts.
  let localPendingPrompt = $state<string | null>(null)
  let creatingDraft = false
  let loadingDocumentId = $state<string | null>(null)
  // Gates the hide-chat toggle: only meaningful once a conversation exists.
  let conversationStarted = $state(false)

  const documents = $derived(
    sceneDocuments.getItems(scene.id).filter((document) => document.kind === 'markdown')
  )
  const activeDocument = $derived(
    activeDocumentId ? sceneDocuments.getFullDocument(activeDocumentId) : null
  )
  const activeDocumentItem = $derived(
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

  async function refreshDocumentItems() {
    await sceneDocuments.refreshScene(scene.id)
  }

  async function loadDocument(documentId: string, options: { force?: boolean } = {}) {
    loadingDocumentId = documentId
    try {
      await sceneDocuments.loadFullDocument(scene.id, documentId, options)
    } finally {
      if (loadingDocumentId === documentId) {
        loadingDocumentId = null
      }
    }
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
      sceneDocuments.upsertFromFullDocument(response.item)
      sceneDocuments.scheduleRevalidation()
      activeDocumentId = response.item.id
    } finally {
      creatingDraft = false
    }
  }

  onMount(() => {
    void refreshDocumentItems().catch((cause) =>
      reportError(cause, 'Failed to load the document workspace.')
    )
  })

  // A prompt arriving from the blank-scene entry screen needs a draft to
  // chat against.
  $effect(() => {
    if (initialPrompt && !activeDocumentId && canModify) {
      void createBlankDraft().catch((cause) => reportError(cause, 'Failed to create a draft.'))
    }
  })

  function handleBlankSend(text: string) {
    localPendingPrompt = text
    void createBlankDraft().catch((cause) => reportError(cause, 'Failed to create a draft.'))
  }

  $effect(() => {
    const nextActiveDocumentId = reconcileActiveDocumentId(activeDocumentId, documents)
    if (nextActiveDocumentId !== activeDocumentId) {
      activeDocumentId = nextActiveDocumentId
      if (!nextActiveDocumentId) {
        localPendingPrompt = null
        liveDraft = null
      }
    }

    const nextContextDocumentIds = contextDocumentIds.filter((id) =>
      documents.some((document) => document.id === id && document.status === 'saved')
    )
    if (nextContextDocumentIds.length !== contextDocumentIds.length) {
      contextDocumentIds = nextContextDocumentIds
    }
  })

  $effect(() => {
    const documentId = activeDocumentId
    if (!documentId || sceneDocuments.getFullDocument(documentId)) {
      return
    }

    void loadDocument(documentId).catch((cause) =>
      reportError(cause, 'Failed to load the document.')
    )
  })

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
    // The chat panel remounts for the new thread; drop any stale preview.
    liveDraft = null

    // Cache-first: a previously opened thread mounts instantly; the fresh
    // fetch below refreshes the cache for the next mount.
    const cached = messagesCache.get(documentId)
    initialMessages = cached ?? null
    conversationStarted = (cached?.length ?? 0) > 0

    void (async () => {
      try {
        const history = await listSceneMessages(canvasId, scene.id, documentId)
        const messages = history.items.map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
          metadata: {
            ...message.metadata,
            author: message.author ?? undefined
          }
        })) as unknown as UIMessage[]

        messagesCache.set(documentId, messages)
        if (activeDocumentId !== documentId) {
          return
        }
        if (initialMessages === null) {
          initialMessages = messages
        }
        if (messages.length > 0) {
          conversationStarted = true
        }
      } catch (cause) {
        reportError(cause, 'Failed to load the conversation.')
      }
    })()
  })

  // Realtime document events from other collaborators are refetch signals.
  $effect(() => {
    if (documentRevision > 0) {
      void refreshDocumentItems().catch((cause) =>
        reportError(cause, 'Failed to refresh documents.')
      )
      if (activeDocumentId) {
        void loadDocument(activeDocumentId, { force: true }).catch((cause) =>
          reportError(cause, 'Failed to refresh the document.')
        )
      }
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

  function handleSelectDocument(documentId: string) {
    activeDocumentId = documentId
    localPendingPrompt = null
    liveDraft = null
    view = 'chat'
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
      const response = await updateSceneDocument(canvasId, scene.id, documentId, {
        status: 'saved'
      })
      sceneDocuments.upsertFromFullDocument(response.item)
      sceneDocuments.scheduleRevalidation()
      void refreshDocumentItems().catch((cause) =>
        reportError(cause, 'Failed to refresh documents.')
      )
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
      sceneDocuments.removeDocument(scene.id, pending.id)
      sceneDocuments.scheduleRevalidation()
      if (activeDocumentId === pending.id) {
        activeDocumentId = null
      }
      void refreshDocumentItems().catch((cause) =>
        reportError(cause, 'Failed to refresh documents.')
      )
      toast.show({
        title: 'Document deleted',
        description: pending.title || 'Untitled document'
      })
    } catch (cause) {
      reportError(cause, 'Failed to delete the document.')
    }
  }

  // Saves target an explicit document id: the editor's unmount flush can
  // fire after the active selection has already changed, and must never
  // write the old draft's text into the newly selected document.
  async function handleSaveDocument(documentId: string, title: string, markdown: string) {
    const target = sceneDocuments.getFullDocument(documentId)
    if (!target) {
      return
    }

    isSavingDocument = true
    try {
      const parsed = markdownDocumentContentSchema.safeParse(target.content)
      const response = await updateSceneDocument(canvasId, scene.id, documentId, {
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
      sceneDocuments.upsertFromFullDocument(response.item)
      sceneDocuments.scheduleRevalidation()
      void refreshDocumentItems().catch((cause) =>
        reportError(cause, 'Failed to refresh documents.')
      )
    } catch (cause) {
      reportError(cause, 'Failed to save the document.')
    } finally {
      isSavingDocument = false
    }
  }

  function handleTurnFinished() {
    conversationStarted = true
    void refreshDocumentItems().catch((cause) => reportError(cause, 'Failed to refresh documents.'))
    if (activeDocumentId) {
      void loadDocument(activeDocumentId, { force: true }).catch((cause) =>
        reportError(cause, 'Failed to refresh the document.')
      )
    }
  }

  function handleMessagesSnapshot(messages: UIMessage[]) {
    if (activeDocumentId) {
      messagesCache.set(activeDocumentId, messages)
    }
  }

  // The document section only exists once there is something to show — a
  // streaming draft, an active document, or the notes view.
  const showWorkPane = $derived(
    liveDraft !== null || activeDocument !== null || activeDocumentItem !== null
  )

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
    <aside
      transition:slide={{ axis: 'x', duration: 280 }}
      class="hidden w-60 shrink-0 overflow-hidden border-r border-border/50 md:block"
    >
      <DocumentListPanel
        {documents}
        {activeDocumentId}
        {canModify}
        onSelect={handleSelectDocument}
        onNewDraft={handleNewDraft}
        onPromote={(id) => void handlePromote(id)}
        onDelete={requestDeleteDocument}
      />
    </aside>
  {/if}

  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <div class="flex items-center gap-1 border-b border-border/50 px-3 py-2">
      <button
        type="button"
        class={`flex size-7 items-center justify-center rounded-full transition ${
          showLibrary ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        onclick={() => (showLibrary = !showLibrary)}
        title="Toggle document library"
        aria-pressed={showLibrary}
      >
        <PanelLeft class="size-4" />
      </button>

      {#if showWorkPane && conversationStarted}
        <button
          type="button"
          class="hidden size-7 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground md:flex"
          onclick={() => (chatCollapsed = !chatCollapsed)}
          title={chatCollapsed ? 'Show the AI chat' : 'Hide the AI chat'}
          aria-pressed={chatCollapsed}
        >
          {#if chatCollapsed}
            <PanelLeftOpen class="size-4" />
          {:else}
            <PanelLeftClose class="size-4" />
          {/if}
        </button>
      {/if}
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
      {#if activeDocument}
        <button
          type="button"
          class={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition ${
            view === 'notes'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onclick={() => (view = view === 'notes' ? 'chat' : 'notes')}
          title="Draw, underline, and highlight on this document"
          aria-pressed={view === 'notes'}
        >
          <NotebookPen class="size-3.5" />
          Notes
        </button>
      {/if}

      {#if activeDocumentItem}
        <span class="ml-auto truncate text-xs text-muted-foreground">
          Working on: {activeDocument?.title || activeDocumentItem.title || 'Untitled draft'}
        </span>
      {/if}
    </div>

    {#if error}
      <div
        class="mx-5 mt-2 flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
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
      <!-- Width-animated (not unmounted): a running stream must survive
           collapsing the chat. -->
      <div
        class={`${view === 'chat' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col md:flex md:flex-none md:overflow-hidden md:transition-[width] md:duration-300 md:ease-out ${
          chatCollapsed ? 'md:w-0' : showWorkPane ? 'md:w-[56%]' : 'md:w-full'
        } ${view === 'chat' ? 'flex-1' : ''}`}
      >
        {#if initialMessages !== null && activeDocumentId}
          {#key activeDocumentId}
            <DocumentChatPanel
              {initialMessages}
              {buildBody}
              {canModify}
              canSend={activeDocumentId !== null}
              currentUserId={userId}
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
              onMessagesSnapshot={handleMessagesSnapshot}
              {modelId}
              onModelChange={(next) => (modelId = next)}
              {webSearch}
              onWebSearchToggle={() => (webSearch = !webSearch)}
              {savedDocuments}
              {contextDocumentIds}
              onToggleContext={toggleContext}
            />
          {/key}
        {:else if !activeDocumentId}
          <!-- Blank state, centered like the scene entry screen, shown
               immediately on open: no draft exists yet — it's created on
               first send. -->
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
          <!-- Skeleton while a thread loads for the first time (cached
               threads mount instantly and never reach this branch). -->
          <div class="flex h-full flex-col gap-3 px-5 py-4" aria-hidden="true">
            <div class="ml-auto h-9 w-3/5 animate-pulse rounded-2xl bg-muted/80"></div>
            <div class="h-16 w-4/5 animate-pulse rounded-2xl bg-muted/60"></div>
            <div class="ml-auto h-9 w-2/5 animate-pulse rounded-2xl bg-muted/80"></div>
            <div class="h-12 w-3/4 animate-pulse rounded-2xl bg-muted/60"></div>
          </div>
        {/if}
      </div>

      {#if showWorkPane}
        <div
          transition:slide={{ axis: 'x', duration: 280 }}
          class={`${view !== 'chat' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col md:flex md:transition-[width] md:duration-300 md:ease-out ${
            chatCollapsed
              ? 'md:w-full md:flex-none'
              : 'md:w-[44%] md:flex-none md:border-l md:border-border/50'
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
            <!-- Keyed by id only: remote updates sync in place inside the
                 editor, preserving the caret during auto-saves. -->
            {#key activeDocument.id}
              {@const editingDocumentId = activeDocument.id}
              <DocumentEditorView
                document={activeDocument}
                {canModify}
                isSaving={isSavingDocument}
                onSave={(title, markdown) =>
                  void handleSaveDocument(editingDocumentId, title, markdown)}
                onPromote={() => void handlePromote(editingDocumentId)}
                onBack={() => (view = 'chat')}
              />
            {/key}
          {:else if activeDocumentItem}
            <div class="flex h-full flex-col gap-3 px-5 py-4" aria-hidden="true">
              <div class="h-8 w-3/5 animate-pulse rounded-xl bg-muted/80"></div>
              <div class="h-full min-h-0 animate-pulse rounded-xl bg-muted/50"></div>
            </div>
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
