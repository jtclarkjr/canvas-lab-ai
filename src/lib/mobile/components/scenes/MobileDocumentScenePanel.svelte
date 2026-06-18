<script lang="ts">
  import type { UIMessage } from 'ai'
  import {
    FilePlus2,
    Files,
    MessageSquare,
    PencilLine,
    Save,
    Trash2
  } from 'lucide-svelte'
  import {
    createSceneDocument,
    deleteSceneDocument,
    listSceneMessages,
    updateSceneDocument
  } from '$lib/scenes/api'
  import {
    markdownDocumentContentSchema,
    type Scene,
    type SceneDocument,
    type SceneDocumentListItem,
    type SceneMessage
  } from '$lib/scenes/schema'
  import { defaultModelId, isKnownModelId } from '$lib/scenes/models'
  import type {
    DraftToolPart,
    SceneActivity,
    SceneActivityKind
  } from '$lib/scenes/types'
  import type { SceneDocumentsStore } from '$lib/stores/scenes/documents.svelte'
  import { toast } from '$lib/stores/shared/toast.svelte'
  import MobileCanvasChatComposer from '$lib/mobile/components/chat/MobileCanvasChatComposer.svelte'
  import MobileDocumentChatPanel from '$lib/mobile/components/scenes/MobileDocumentChatPanel.svelte'

  type PanelView = 'chat' | 'library' | 'editor'

  let {
    canvasId,
    scene,
    userId,
    canModify,
    documentRevision,
    liveMessages,
    remoteActivity,
    remoteStreamingText,
    sceneDocumentsStore,
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
    sceneDocumentsStore: SceneDocumentsStore
    initialPrompt: string | null
    onInitialPromptSent: () => void
    onBroadcastActivity: (kind: SceneActivityKind, textDelta?: string) => void
  }>()

  const messagesCache = new Map<string, UIMessage[]>()

  let view = $state<PanelView>('chat')
  let activeDocumentId = $state<string | null>(null)
  let activeDocument = $state<SceneDocument | null>(null)
  let initialMessages = $state<UIMessage[] | null>(null)
  let titleDraft = $state('')
  let markdownDraft = $state('')
  let isLoading = $state(false)
  let isSaving = $state(false)
  let error = $state<string | null>(null)
  let loadedMessagesForDocumentId = $state<string | null>(null)
  let localPendingPrompt = $state<string | null>(null)
  let consumedInitialPrompt = $state<string | null>(null)
  let liveDraft = $state<DraftToolPart | null>(null)
  let creatingDraft = false
  let webSearch = $state(false)
  // svelte-ignore state_referenced_locally -- seeds this mobile scene thread from scene settings.
  let modelId = $state(
    typeof scene.settings.modelId === 'string' &&
      isKnownModelId(scene.settings.modelId)
      ? scene.settings.modelId
      : defaultModelId
  )

  const items = $derived(
    sceneDocumentsStore
      .getItems(scene.id)
      .filter((item: SceneDocumentListItem) => item.kind === 'markdown')
  )
  const liveMessagesForActiveDocument = $derived(
    liveMessages.filter(
      (message: SceneMessage) => message.documentId === activeDocumentId
    )
  )

  $effect(() => {
    if (
      !initialPrompt ||
      !canModify ||
      consumedInitialPrompt === initialPrompt
    ) {
      return
    }
    consumedInitialPrompt = initialPrompt
    if (!localPendingPrompt) {
      localPendingPrompt = initialPrompt
    }
    view = 'chat'
    onInitialPromptSent()
  })

  $effect(() => {
    if (localPendingPrompt && !activeDocumentId && canModify) {
      void createDraft('chat')
    }
  })

  $effect(() => {
    const firstItem = items[0]
    const activeStillExists = activeDocumentId
      ? items.some(
          (item: SceneDocumentListItem) => item.id === activeDocumentId
        )
      : false

    if (activeDocumentId && !activeStillExists) {
      activeDocumentId = null
      activeDocument = null
      initialMessages = null
      liveDraft = null
      titleDraft = ''
      markdownDraft = ''
      return
    }

    if (!activeDocumentId && firstItem && !localPendingPrompt) {
      void openDocument(firstItem.id, 'chat')
    }
  })

  $effect(() => {
    const documentId = activeDocumentId
    if (!documentId) {
      initialMessages = null
      loadedMessagesForDocumentId = null
      return
    }
    if (loadedMessagesForDocumentId === documentId) return

    loadedMessagesForDocumentId = documentId
    liveDraft = null

    const cached = messagesCache.get(documentId)
    initialMessages = cached ?? null

    void (async () => {
      try {
        const history = await listSceneMessages(canvasId, scene.id, documentId)
        const messages: UIMessage[] = history.items.map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
          metadata: {
            ...message.metadata,
            author: message.author ?? undefined
          }
        }))

        messagesCache.set(documentId, messages)
        if (activeDocumentId === documentId && initialMessages === null) {
          initialMessages = messages
        }
      } catch (cause) {
        error =
          cause instanceof Error
            ? cause.message
            : 'Failed to load the conversation.'
      }
    })()
  })

  $effect(() => {
    if (documentRevision > 0 && activeDocumentId) {
      void reloadActiveDocument()
    }
  })

  function parseMarkdown(document: SceneDocument | null) {
    if (!document) return ''
    const parsed = markdownDocumentContentSchema.safeParse(document.content)
    return parsed.success ? parsed.data.markdown : ''
  }

  async function refresh() {
    error = null
    try {
      await sceneDocumentsStore.refreshScene(scene.id)
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to load documents.'
    }
  }

  async function openDocument(
    documentId: string,
    nextView: PanelView = 'chat',
    options: { force?: boolean } = {}
  ) {
    activeDocumentId = documentId
    isLoading = true
    error = null
    try {
      const document = await sceneDocumentsStore.loadFullDocument(
        scene.id,
        documentId,
        options
      )
      activeDocument = document
      titleDraft = document.title || 'Untitled'
      markdownDraft = parseMarkdown(document)
      view = nextView
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to open document.'
    } finally {
      isLoading = false
    }
  }

  async function reloadActiveDocument() {
    const documentId = activeDocumentId
    if (!documentId) return
    try {
      const document = await sceneDocumentsStore.loadFullDocument(
        scene.id,
        documentId,
        { force: true }
      )
      if (activeDocumentId !== documentId) return
      activeDocument = document
      if (!liveDraft) {
        titleDraft = document.title || 'Untitled'
        markdownDraft = parseMarkdown(document)
      }
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to refresh document.'
    }
  }

  async function createDraft(nextView: PanelView = 'chat') {
    if (!canModify || isSaving || creatingDraft) return
    creatingDraft = true
    isSaving = true
    error = null
    try {
      const response = await createSceneDocument(canvasId, scene.id, {
        kind: 'markdown',
        status: 'draft',
        title: '',
        content: {}
      })
      sceneDocumentsStore.upsertFromFullDocument(response.item)
      sceneDocumentsStore.scheduleRevalidation()
      await openDocument(response.item.id, nextView)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Failed to create draft.'
    } finally {
      isSaving = false
      creatingDraft = false
    }
  }

  async function saveDocument(status: 'draft' | 'saved' = 'draft') {
    if (!canModify || !activeDocument || isSaving) return
    isSaving = true
    error = null
    try {
      const response = await updateSceneDocument(
        canvasId,
        scene.id,
        activeDocument.id,
        {
          title: titleDraft.trim() || 'Untitled',
          status,
          content: {
            ...activeDocument.content,
            docType: scene.settings.category ?? 'doc-md',
            markdown: markdownDraft
          }
        }
      )
      activeDocument = response.item
      sceneDocumentsStore.upsertFromFullDocument(response.item)
      sceneDocumentsStore.scheduleRevalidation()
      toast.show({
        title: status === 'saved' ? 'Document saved' : 'Draft saved',
        description: response.item.title || 'Untitled'
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to save document.'
    } finally {
      isSaving = false
    }
  }

  async function removeActiveDocument() {
    if (!canModify || !activeDocument) return
    if (!window.confirm('Delete this document?')) return
    const documentId = activeDocument.id
    error = null
    try {
      await deleteSceneDocument(canvasId, scene.id, documentId)
      sceneDocumentsStore.removeDocument(scene.id, documentId)
      activeDocument = null
      activeDocumentId = null
      initialMessages = null
      liveDraft = null
      titleDraft = ''
      markdownDraft = ''
      view = 'library'
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Failed to delete document.'
    }
  }

  function handleBlankSend(text: string) {
    if (!canModify || isSaving) return
    localPendingPrompt = text
    view = 'chat'
    void createDraft('chat')
  }

  function buildBody() {
    return {
      canvasId,
      sceneId: scene.id,
      documentId: activeDocumentId ?? '',
      contextDocumentIds: [],
      modelId,
      category:
        typeof scene.settings.category === 'string'
          ? scene.settings.category
          : 'doc-md',
      webSearch
    }
  }

  function handleTurnFinished() {
    void refresh()
    void reloadActiveDocument()
  }

  function handleMessagesSnapshot(messages: UIMessage[]) {
    if (activeDocumentId) {
      messagesCache.set(activeDocumentId, messages)
    }
  }

  function handleLiveDraftChange(draft: DraftToolPart | null) {
    liveDraft = draft
    if (!draft) return
    if (draft.title) {
      titleDraft = draft.title
    }
    markdownDraft = draft.content
  }
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="shrink-0 border-b border-border/60 px-3 py-2">
    <div class="grid grid-cols-3 gap-1 rounded-full bg-muted/50 p-1">
      <button
        type="button"
        class={`flex h-9 items-center justify-center gap-1 rounded-full text-xs font-bold ${
          view === 'chat'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground'
        }`}
        onclick={() => (view = 'chat')}
      >
        <MessageSquare class="size-4" aria-hidden="true" />
        Chat
      </button>
      <button
        type="button"
        class={`flex h-9 items-center justify-center gap-1 rounded-full text-xs font-bold ${
          view === 'library'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground'
        }`}
        onclick={() => (view = 'library')}
      >
        <Files class="size-4" aria-hidden="true" />
        Library
      </button>
      <button
        type="button"
        class={`flex h-9 items-center justify-center gap-1 rounded-full text-xs font-bold ${
          view === 'editor'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground'
        }`}
        onclick={() => (view = 'editor')}
        disabled={!activeDocument}
      >
        <PencilLine class="size-4" aria-hidden="true" />
        Editor
      </button>
    </div>
  </div>

  {#if view === 'chat'}
    <div class="flex min-h-0 flex-1 flex-col">
      {#if activeDocumentId && initialMessages !== null}
        {#key activeDocumentId}
          <MobileDocumentChatPanel
            {initialMessages}
            {buildBody}
            {canModify}
            canSend={activeDocumentId !== null}
            currentUserId={userId}
            liveMessages={liveMessagesForActiveDocument}
            {remoteActivity}
            {remoteStreamingText}
            initialPrompt={localPendingPrompt}
            onInitialPromptSent={() => (localPendingPrompt = null)}
            {onBroadcastActivity}
            onTurnFinished={handleTurnFinished}
            onLiveDraftChange={handleLiveDraftChange}
            onMessagesSnapshot={handleMessagesSnapshot}
            {webSearch}
            onWebSearchToggle={() => (webSearch = !webSearch)}
          />
        {/key}
      {:else if activeDocumentId}
        <div class="flex flex-1 flex-col gap-3 px-4 py-3" aria-hidden="true">
          <div
            class="ml-auto h-10 w-3/5 animate-pulse rounded-2xl bg-muted/80"
          ></div>
          <div class="h-16 w-4/5 animate-pulse rounded-2xl bg-muted/60"></div>
          <div
            class="ml-auto h-10 w-2/5 animate-pulse rounded-2xl bg-muted/80"
          ></div>
        </div>
      {:else}
        <div
          class="flex min-h-0 flex-1 flex-col justify-center gap-5 px-6 text-center"
        >
          <div>
            <h3 class="text-lg font-semibold text-foreground">
              What do you want to draft?
            </h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Describe the document, or pick one from the library.
            </p>
          </div>
        </div>
        <MobileCanvasChatComposer
          disabled={!canModify || isSaving}
          isStreaming={isSaving}
          placeholder="Ask AI to draft..."
          {webSearch}
          onWebSearchToggle={() => (webSearch = !webSearch)}
          onSend={handleBlankSend}
        />
      {/if}
    </div>
  {:else if view === 'library'}
    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <div class="mb-3 flex gap-2">
        <button
          type="button"
          class="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          onclick={() => void createDraft('chat')}
          disabled={!canModify || isSaving}
        >
          <FilePlus2 class="size-4" aria-hidden="true" />
          New draft
        </button>
        <button
          type="button"
          class="h-10 rounded-full border border-border/70 px-3 text-sm font-semibold"
          onclick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      {#if items.length === 0}
        <p
          class="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground"
        >
          No documents yet.
        </p>
      {:else}
        <div class="space-y-2">
          {#each items as item (item.id)}
            <button
              type="button"
              class={`w-full rounded-xl border px-3 py-3 text-left ${
                item.id === activeDocumentId
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border/70 bg-background/70'
              }`}
              onclick={() => void openDocument(item.id, 'chat')}
            >
              <span class="block truncate text-sm font-semibold">
                {item.title || 'Untitled'}
              </span>
              <span class="mt-1 block text-xs text-muted-foreground">
                {item.status} · {new Date(item.updatedAt).toLocaleString()}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex min-h-0 flex-1 flex-col">
      {#if isLoading}
        <div
          class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
        >
          Loading...
        </div>
      {:else if activeDocument}
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <input
            class="mb-3 h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
            bind:value={titleDraft}
            disabled={!canModify}
            aria-label="Document title"
          />
          <textarea
            class="min-h-[56dvh] w-full resize-none rounded-xl border border-border/70 bg-background p-3 text-base leading-relaxed outline-none focus:border-primary"
            bind:value={markdownDraft}
            disabled={!canModify}
            aria-label="Document markdown"
            placeholder="Write document markdown..."
          ></textarea>
        </div>
        <div
          class="grid shrink-0 grid-cols-3 gap-2 border-t border-border/60 bg-card px-3 py-2"
          style="padding-bottom:max(0.5rem, env(safe-area-inset-bottom));"
        >
          <button
            type="button"
            class="flex h-10 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold disabled:opacity-50"
            onclick={() => void saveDocument('draft')}
            disabled={!canModify || isSaving}
          >
            <Save class="size-4" aria-hidden="true" />
            Draft
          </button>
          <button
            type="button"
            class="h-10 rounded-full bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50"
            onclick={() => void saveDocument('saved')}
            disabled={!canModify || isSaving}
          >
            Save
          </button>
          <button
            type="button"
            class="flex h-10 items-center justify-center gap-1 rounded-full bg-secondary text-xs font-bold text-destructive disabled:opacity-50"
            onclick={() => void removeActiveDocument()}
            disabled={!canModify || isSaving}
          >
            <Trash2 class="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      {:else}
        <div
          class="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground"
        >
          Select or create a document.
        </div>
      {/if}
    </div>
  {/if}

  {#if error}
    <p
      class="mx-4 mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
    >
      {error}
    </p>
  {/if}
</div>
