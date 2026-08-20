<script lang="ts">
  import ContextPicker from '../ContextPicker.svelte'
  import DocumentChatPanel from '../DocumentChatPanel.svelte'
  import DocumentComposer from '../DocumentComposer.svelte'
  import DocumentEditorView from '../DocumentEditorView.svelte'
  import DocumentListPanel from '../DocumentListPanel.svelte'
  import DocumentLivePreview from '../DocumentLivePreview.svelte'
  import DocumentMessageList from '../DocumentMessageList.svelte'
  import DocumentScenePanel from '../DocumentScenePanel.svelte'
  import ModelPicker from '../ModelPicker.svelte'
  import PresetPicker from '../PresetPicker.svelte'
  import { defaultModelId } from '$lib/scenes/models'
  import { documentItems, documentMessages, draftDocument } from './fixtures'

  type Target =
    | 'chat-panel'
    | 'composer'
    | 'context-picker'
    | 'editor'
    | 'list-panel'
    | 'live-preview'
    | 'message-list'
    | 'model-picker'
    | 'preset-picker'
    | 'scene-panel'

  let { target } = $props<{ target: Target }>()

  let modelId = $state(defaultModelId)
  let categoryId = $state('doc-md')
  let selectedIds = $state<string[]>([])
  let result = $state('')

  function toggleContext(documentId: string) {
    selectedIds = selectedIds.includes(documentId)
      ? selectedIds.filter((id) => id !== documentId)
      : [...selectedIds, documentId]
    result = selectedIds.join(',')
  }
</script>

<div class="min-h-[40rem] bg-background p-6 text-foreground">
  {#if target === 'context-picker'}
    <ContextPicker
      savedDocuments={documentItems.filter((item) => item.status === 'saved')}
      {selectedIds}
      onToggle={toggleContext}
    />
  {:else if target === 'model-picker'}
    <ModelPicker
      {modelId}
      onModelChange={(next) => {
        modelId = next
        result = next
      }}
    />
  {:else if target === 'preset-picker'}
    <PresetPicker
      {categoryId}
      onCategoryChange={(next) => (categoryId = next)}
      onPresetPick={(prompt) => (result = prompt)}
    />
  {:else if target === 'composer'}
    <div class="mx-auto mt-36 max-w-2xl">
      <DocumentComposer
        floating
        {modelId}
        onModelChange={(next) => (modelId = next)}
        webSearch
        onWebSearchToggle={() => undefined}
        savedDocuments={documentItems.filter((item) => item.status === 'saved')}
        contextDocumentIds={selectedIds}
        onToggleContext={toggleContext}
        onSend={(text) => (result = text)}
      />
    </div>
  {:else if target === 'list-panel'}
    <div class="h-[34rem] w-72 rounded-2xl border border-border/60 bg-card">
      <DocumentListPanel
        documents={documentItems}
        activeDocumentId={draftDocument.id}
        canModify
        onSelect={(id) => (result = `select:${id}`)}
        onNewDraft={() => (result = 'new-draft')}
        onPromote={(id) => (result = `promote:${id}`)}
        onDelete={(id) => (result = `delete:${id}`)}
      />
    </div>
  {:else if target === 'live-preview'}
    <div
      class="h-[34rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <DocumentLivePreview
        title="Research brief"
        content="# Research brief\n\nAI is drafting the synthesis…"
      />
    </div>
  {:else if target === 'message-list'}
    <div
      class="h-[34rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <DocumentMessageList
        messages={documentMessages}
        currentUserId="user-james"
      />
    </div>
  {:else if target === 'chat-panel'}
    <div
      class="h-[34rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <DocumentChatPanel
        initialMessages={documentMessages}
        buildBody={() => ({ canvasId: 'canvas-story' })}
        canModify
        canSend
        currentUserId="user-james"
        liveMessages={[]}
        remoteActivity={null}
        remoteStreamingText=""
        initialPrompt={null}
        onInitialPromptSent={() => undefined}
        onBroadcastActivity={() => undefined}
        onTurnFinished={() => undefined}
        onLiveDraftChange={() => undefined}
        onMessagesSnapshot={() => undefined}
        {modelId}
        onModelChange={(next) => (modelId = next)}
        webSearch
        onWebSearchToggle={() => undefined}
        savedDocuments={documentItems.filter((item) => item.status === 'saved')}
        contextDocumentIds={selectedIds}
        onToggleContext={toggleContext}
      />
    </div>
  {:else if target === 'editor'}
    <div
      class="h-[34rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <DocumentEditorView
        document={draftDocument}
        canModify
        onSave={(title, markdown) => {
          result = `${title}|${markdown}`
        }}
        onPromote={() => (result = 'promote')}
        onBack={() => (result = 'back')}
      />
    </div>
  {:else if target === 'scene-panel'}
    <div
      class="h-[36rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <DocumentScenePanel
        canvasId="canvas-document-panel-story"
        scene={{
          id: 'scene-document-panel-story',
          canvasId: 'canvas-document-panel-story',
          type: 'document',
          title: 'Research brief',
          x: 0,
          y: 0,
          width: 640,
          height: 480,
          rotation: 0,
          settings: { category: 'doc-md' },
          createdBy: 'user-james',
          updatedBy: 'user-james',
          createdAt: '2026-08-19T10:00:00.000Z',
          updatedAt: '2026-08-19T10:05:00.000Z'
        }}
        userId="user-james"
        canModify
        documentRevision={0}
        liveMessages={[]}
        remoteActivity={null}
        remoteStreamingText=""
        initialPrompt={null}
        onInitialPromptSent={() => undefined}
        onBroadcastActivity={() => undefined}
      />
    </div>
  {/if}

  <output class="sr-only" data-testid="document-result">{result}</output>
</div>
