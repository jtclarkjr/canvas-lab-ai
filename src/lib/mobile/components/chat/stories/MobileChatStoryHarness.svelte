<script lang="ts">
  import type { UIMessage } from 'ai'
  import { onMount } from 'svelte'
  import MobileCanvasAssistantPanel from '../MobileCanvasAssistantPanel.svelte'
  import MobileCanvasAssistantThread from '../MobileCanvasAssistantThread.svelte'
  import MobileCanvasChat from '../MobileCanvasChat.svelte'
  import MobileCanvasChatComposer from '../MobileCanvasChatComposer.svelte'
  import MobileCanvasChatRoomPanel from '../MobileCanvasChatRoomPanel.svelte'
  import MobileCanvasChatWindow from '../MobileCanvasChatWindow.svelte'
  import { provideCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import {
    storyThreadId,
    storyUserId
  } from '$lib/components/canvas/chat/stories/chat.msw'

  type Target =
    | 'assistant-panel'
    | 'assistant-thread'
    | 'chat'
    | 'composer'
    | 'room-panel'
    | 'window'

  let { target, fixtureId = 'default' } = $props<{
    target: Target
    fixtureId?: string
  }>()

  const canvasId = $derived(`mobile-chat-story-${target}-${fixtureId}`)
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

    if (target === 'assistant-panel' || target === 'assistant-thread') {
      store.openWindow()
      store.setTab('assistant')
      return
    }

    if (target === 'chat' || target === 'window') {
      store.openWindow()
    }
  })
</script>

<div
  class="mx-auto min-h-[44rem] w-full max-w-[24.375rem] bg-background text-foreground"
>
  {#if target === 'composer'}
    <div class="pt-72">
      <MobileCanvasChatComposer
        placeholder="Message the canvas..."
        mentionMembers={[
          { id: 'user-ada', name: 'Ada Lovelace', color: '#7c3aed' },
          { id: 'user-grace', name: 'Grace Hopper', color: '#0369a1' }
        ]}
        webSearch={true}
        onWebSearchToggle={() => undefined}
        onSend={(text) => (sentMessage = text)}
      />
      <output class="sr-only" data-testid="sent-message">{sentMessage}</output>
    </div>
  {:else if target === 'chat'}
    <MobileCanvasChat {canvasId} userId={storyUserId} />
  {:else if target === 'window'}
    <MobileCanvasChatWindow {canvasId} userId={storyUserId} />
  {:else if target === 'room-panel'}
    <div class="h-[42rem] overflow-hidden bg-card">
      <MobileCanvasChatRoomPanel userId={storyUserId} alwaysVisible />
    </div>
  {:else if target === 'assistant-panel'}
    <div class="h-[42rem] overflow-hidden bg-card">
      <MobileCanvasAssistantPanel {canvasId} />
    </div>
  {:else if target === 'assistant-thread'}
    <div class="h-[42rem] overflow-hidden bg-card">
      <MobileCanvasAssistantThread
        {canvasId}
        threadId={storyThreadId}
        {initialMessages}
      />
    </div>
  {/if}
</div>
