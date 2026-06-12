<script lang="ts">
  import { MessageSquare, Minimize2, Sparkles } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/canvas/chat/canvas-chat.svelte'
  import CanvasAssistantPanel from '$lib/components/canvas/chat/CanvasAssistantPanel.svelte'
  import CanvasChatRoomPanel from '$lib/components/canvas/chat/CanvasChatRoomPanel.svelte'

  let { canvasId, userId, getLauncherRect } = $props<{
    canvasId: string
    userId: string
    getLauncherRect: () => DOMRect | null
  }>()

  const store = useCanvasChatStore()

  let windowEl = $state<HTMLDivElement | null>(null)
  let isClosing = false
  // The minimize animation fills forwards so the window stays collapsed
  // until it is hidden; the next expand cancels it first.
  let activeAnimation: Animation | null = null

  function flipTransform(from: DOMRect, to: DOMRect) {
    const scaleX = from.width / to.width
    const scaleY = from.height / to.height
    return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scaleX}, ${scaleY})`
  }

  // Expand from the launcher pill into the window (FLIP). The window stays
  // mounted while minimized (so a streaming assistant turn survives), so
  // this runs on every reopen, not just mount.
  $effect(() => {
    if (!store.open) return
    const el = windowEl
    if (!el) return

    activeAnimation?.cancel()
    el.style.transformOrigin = 'top left'
    const origin = getLauncherRect()
    const target = el.getBoundingClientRect()

    if (origin) {
      activeAnimation = el.animate(
        [
          { transform: flipTransform(origin, target), opacity: 0.4 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
    } else {
      activeAnimation = el.animate(
        [
          { transform: 'scale(0.96)', opacity: 0 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: 200, easing: 'ease-out' }
      )
    }
  })

  // Minimize back into the launcher's live rect, then hide. No backdrop and
  // no off-click/Escape close — a chat should only close deliberately.
  async function minimize() {
    if (isClosing) return
    isClosing = true

    const el = windowEl
    const origin = getLauncherRect()
    activeAnimation?.cancel()

    if (el && origin) {
      el.style.transformOrigin = 'top left'
      const target = el.getBoundingClientRect()
      activeAnimation = el.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: flipTransform(origin, target), opacity: 0.15 }
        ],
        { duration: 240, easing: 'cubic-bezier(0.55, 0, 0.55, 0.2)', fill: 'forwards' }
      )
      await activeAnimation.finished.catch(() => undefined)
    } else if (el) {
      activeAnimation = el.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: 'scale(0.96)', opacity: 0 }
        ],
        { duration: 150, easing: 'ease-in', fill: 'forwards' }
      )
      await activeAnimation.finished.catch(() => undefined)
    }

    store.minimize()
    isClosing = false
  }

  const tabClass = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition ${
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
    }`
</script>

<div
  bind:this={windowEl}
  class="glass-card fixed bottom-6 right-6 z-40 h-[min(35rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-3rem))] cursor-auto flex-col overflow-hidden"
  style:display={store.open ? 'flex' : 'none'}
  role="dialog"
  aria-label="Canvas chat"
  data-camera-exempt
>
  <header class="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
    <div class="flex items-center gap-1" role="tablist" aria-label="Chat tabs">
      <button
        type="button"
        role="tab"
        aria-selected={store.activeTab === 'chat'}
        class={tabClass(store.activeTab === 'chat')}
        onclick={() => store.setTab('chat')}
      >
        <MessageSquare class="size-3.5" />
        Chat
        {#if store.unreadCount > 0 && store.activeTab !== 'chat'}
          <span
            class="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
          >
            {store.unreadCount > 9 ? '9+' : store.unreadCount}
          </span>
        {/if}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={store.activeTab === 'assistant'}
        class={tabClass(store.activeTab === 'assistant')}
        onclick={() => store.setTab('assistant')}
      >
        <Sparkles class="size-3.5" />
        Assistant
      </button>
    </div>

    <button
      type="button"
      class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={() => void minimize()}
      title="Minimize"
    >
      <Minimize2 class="size-4" />
    </button>
  </header>

  <!-- Both panels stay mounted so tab switches keep scroll positions and a
       streaming assistant turn keeps running in the background. -->
  <div class={store.activeTab === 'chat' ? 'min-h-0 flex-1' : 'hidden'}>
    <CanvasChatRoomPanel {userId} />
  </div>
  <div class={store.activeTab === 'assistant' ? 'min-h-0 flex-1' : 'hidden'}>
    <CanvasAssistantPanel {canvasId} />
  </div>
</div>
