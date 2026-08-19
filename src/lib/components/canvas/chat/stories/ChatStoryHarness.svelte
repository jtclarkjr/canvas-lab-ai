<script lang="ts">
  import type { UIMessage } from 'ai'
  import { onMount } from 'svelte'
  import CanvasAssistantHistorySidebar from '../CanvasAssistantHistorySidebar.svelte'
  import CanvasAssistantPanel from '../CanvasAssistantPanel.svelte'
  import CanvasAssistantThread from '../CanvasAssistantThread.svelte'
  import CanvasAssistantWorkspace from '../CanvasAssistantWorkspace.svelte'
  import CanvasChat from '../CanvasChat.svelte'
  import CanvasChatComposer from '../CanvasChatComposer.svelte'
  import CanvasChatLauncher from '../CanvasChatLauncher.svelte'
  import CanvasChatRoomPanel from '../CanvasChatRoomPanel.svelte'
  import CanvasChatWindow from '../CanvasChatWindow.svelte'
  import { provideCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { storyThreadId, storyUserId } from './chat.msw'

  type Target =
    | 'assistant-history'
    | 'assistant-panel'
    | 'assistant-thread'
    | 'assistant-workspace'
    | 'chat'
    | 'composer'
    | 'launcher'
    | 'room-panel'
    | 'window'

  let { target, fixtureId = 'default' } = $props<{
    target: Target
    fixtureId?: string
  }>()

  const canvasId = $derived(`chat-story-${target}-${fixtureId}`)
  const store = provideCanvasChatStore({
    getCanvasId: () => canvasId,
    getUserId: () => storyUserId,
    getEnabled: () => false
  })

  let sentMessage = $state('')
  const initialMessages: UIMessage[] = [
    {
      id: 'assistant-user-message',
      role: 'user',
      parts: [{ type: 'text', text: 'Summarize the canvas.' }]
    },
    {
      id: 'assistant-response',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'The canvas groups the research into **three themes**.'
        }
      ]
    }
  ]

  onMount(() => {
    if (target === 'room-panel') {
      void store.ensureLoaded()
      void store.ensureMembersLoaded()
      return
    }

    if (
      target === 'assistant-history' ||
      target === 'assistant-panel' ||
      target === 'assistant-thread' ||
      target === 'assistant-workspace'
    ) {
      store.maximize()
      return
    }

    if (target === 'window') {
      store.openWindow()
    }
  })
</script>

<div class="min-h-[40rem] bg-background p-6 text-foreground">
  {#if target === 'composer'}
    <div
      class="mx-auto mt-48 w-full max-w-md overflow-visible rounded-2xl border border-border/60 bg-card"
    >
      <CanvasChatComposer
        placeholder="Message the canvas…"
        mentionMembers={[
          { id: 'user-ada', name: 'Ada Lovelace', color: '#7c3aed' },
          { id: 'user-grace', name: 'Grace Hopper', color: '#0284c7' }
        ]}
        webSearch={true}
        onWebSearchToggle={() => undefined}
        onSend={(text) => (sentMessage = text)}
      />
      <output class="sr-only" data-testid="sent-message">{sentMessage}</output>
    </div>
  {:else if target === 'launcher'}
    <CanvasChatLauncher />
    <output class="sr-only" data-testid="store-open"
      >{String(store.open)}</output
    >
  {:else if target === 'chat'}
    <CanvasChat {canvasId} userId={storyUserId} />
  {:else if target === 'window'}
    <CanvasChatWindow
      {canvasId}
      userId={storyUserId}
      getLauncherRect={() => null}
    />
  {:else if target === 'room-panel'}
    <div
      class="mx-auto h-[34rem] w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <CanvasChatRoomPanel userId={storyUserId} alwaysVisible />
    </div>
  {:else if target === 'assistant-history'}
    <div
      class="h-[34rem] w-72 overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <CanvasAssistantHistorySidebar />
    </div>
  {:else if target === 'assistant-panel'}
    <div
      class="mx-auto h-[34rem] w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <CanvasAssistantPanel {canvasId} />
    </div>
  {:else if target === 'assistant-thread'}
    <div
      class="mx-auto h-[34rem] w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <CanvasAssistantThread
        {canvasId}
        threadId={storyThreadId}
        {initialMessages}
      />
    </div>
  {:else if target === 'assistant-workspace'}
    <div
      class="h-[34rem] overflow-hidden rounded-2xl border border-border/60 bg-card"
    >
      <CanvasAssistantWorkspace {canvasId} />
    </div>
  {/if}
</div>
