<script lang="ts">
  import { Chat } from '@ai-sdk/svelte'
  import { DefaultChatTransport, type UIMessage } from 'ai'
  import { getApiHeaders } from '$lib/api-client'
  import type { SceneDocument, SceneMessage } from '$lib/scenes/schema'
  import type { SceneActivity, SceneActivityKind } from '$lib/scenes/types'
  import {
    asParts,
    messageText,
    writeDocumentPart,
    type DisplayMessage,
    type DraftToolPart
  } from '$lib/scenes/chat-parts'
  import DocumentComposer from '$lib/components/canvas/scenes/document/DocumentComposer.svelte'
  import DocumentMessageList from '$lib/components/canvas/scenes/document/DocumentMessageList.svelte'

  let {
    initialMessages,
    buildBody,
    canModify,
    canSend,
    currentUserId,
    liveMessages,
    remoteActivity,
    remoteStreamingText,
    initialPrompt,
    onInitialPromptSent,
    onBroadcastActivity,
    onTurnFinished,
    onLiveDraftChange,
    onMessagesSnapshot,
    modelId,
    onModelChange,
    webSearch,
    onWebSearchToggle,
    savedDocuments,
    contextDocumentIds,
    onToggleContext
  } = $props<{
    initialMessages: UIMessage[]
    buildBody: () => Record<string, unknown>
    canModify: boolean
    canSend: boolean
    currentUserId: string
    liveMessages: SceneMessage[]
    remoteActivity: SceneActivity | null
    remoteStreamingText: string
    initialPrompt: string | null
    onInitialPromptSent: () => void
    onBroadcastActivity: (kind: SceneActivityKind, textDelta?: string) => void
    onTurnFinished: () => void
    onLiveDraftChange: (draft: DraftToolPart | null) => void
    onMessagesSnapshot: (messages: UIMessage[]) => void
    modelId: string
    onModelChange: (modelId: string) => void
    webSearch: boolean
    onWebSearchToggle: () => void
    savedDocuments: SceneDocument[]
    contextDocumentIds: string[]
    onToggleContext: (documentId: string) => void
  }>()

  const chat = new Chat({
    // svelte-ignore state_referenced_locally -- history seeds the chat once;
    // the panel only mounts after it has loaded
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/document-chat',
      prepareSendMessagesRequest: async ({ messages }) => ({
        headers: await getApiHeaders({ 'content-type': 'application/json' }),
        body: { ...buildBody(), messages }
      })
    }),
    onFinish: () => {
      onTurnFinished()
      onMessagesSnapshot($state.snapshot(chat.messages) as UIMessage[])
    }
  })

  const isStreaming = $derived(chat.status === 'submitted' || chat.status === 'streaming')

  // Merge this client's chat with messages other collaborators produced
  // (delivered over realtime, deduped by message id).
  const displayMessages = $derived.by(() => {
    const own = chat.messages as unknown as DisplayMessage[]
    const ownIds = new Set(own.map((message) => message.id))
    const remote = liveMessages
      .filter((message: SceneMessage) => !ownIds.has(message.id))
      .map((message: SceneMessage) => ({
        id: message.id,
        role: message.role,
        parts: message.parts,
        metadata: { ...message.metadata, author: message.author ?? undefined }
      }))
    return [...own, ...remote]
  })

  // Before sending a new prompt, fold collaborator messages into the chat
  // history so they keep their chronological position (and become context
  // for the model) instead of trailing below newer turns.
  function absorbRemoteMessages() {
    const ownIds = new Set(chat.messages.map((message) => message.id))
    const remote = liveMessages.filter((message: SceneMessage) => !ownIds.has(message.id))
    if (remote.length > 0) {
      chat.messages = [
        ...chat.messages,
        ...(remote.map((message: SceneMessage) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
          metadata: { ...message.metadata, author: message.author ?? undefined }
        })) as unknown as UIMessage[])
      ]
    }
  }

  function handleSend(text: string) {
    absorbRemoteMessages()
    void chat.sendMessage({ text })
  }

  // The in-progress write_document call, streamed to the editor pane so
  // the document appears there live — the chat only shows action lines.
  const liveDraft = $derived.by(() => {
    if (chat.status !== 'submitted' && chat.status !== 'streaming') {
      return null
    }

    const last = chat.lastMessage
    if (last?.role !== 'assistant') {
      return null
    }

    let draft: DraftToolPart | null = null
    for (const part of asParts((last as unknown as DisplayMessage).parts)) {
      draft = writeDocumentPart(part) ?? draft
    }
    return draft
  })

  $effect(() => {
    onLiveDraftChange(liveDraft)
  })

  // Seed the first prompt coming from the blank-scene entry screen.
  $effect(() => {
    if (initialPrompt && chat.status === 'ready') {
      const text = initialPrompt
      onInitialPromptSent()
      void chat.sendMessage({ text })
    }
  })

  // Relay this client's generation to other collaborators: a "generating"
  // badge plus throttled text deltas of the assistant response.
  let announcedGenerating = false
  let broadcastTextLength = 0

  $effect(() => {
    const status = chat.status
    const last = chat.lastMessage

    if (status === 'submitted' || status === 'streaming') {
      if (!announcedGenerating) {
        announcedGenerating = true
        broadcastTextLength = 0
        onBroadcastActivity('generating')
      }
      if (last?.role === 'assistant') {
        const text = messageText(last as unknown as DisplayMessage)
        if (text.length > broadcastTextLength) {
          onBroadcastActivity('generating', text.slice(broadcastTextLength))
          broadcastTextLength = text.length
        }
      }
      return
    }

    if (announcedGenerating) {
      announcedGenerating = false
      broadcastTextLength = 0
      onBroadcastActivity('idle')
    }
  })
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="min-h-0 flex-1">
    <DocumentMessageList
      messages={displayMessages}
      {currentUserId}
      {remoteStreamingText}
      isRemoteGenerating={remoteActivity?.kind === 'generating'}
      remoteGeneratorName={remoteActivity?.userName ?? ''}
    />
  </div>

  {#if chat.error}
    <div
      class="mx-5 mb-2 flex items-center justify-between rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600"
    >
      <span>{chat.error.message || 'Something went wrong.'}</span>
      <button type="button" class="font-medium underline" onclick={() => chat.clearError()}>
        Dismiss
      </button>
    </div>
  {/if}

  <DocumentComposer
    disabled={!canModify || !canSend}
    {isStreaming}
    {modelId}
    {onModelChange}
    {webSearch}
    {onWebSearchToggle}
    {savedDocuments}
    {contextDocumentIds}
    {onToggleContext}
    onSend={handleSend}
  />
</div>
