<script lang="ts">
  import { tick } from 'svelte'
  import {
    Maximize2,
    MessageSquare,
    Minimize2,
    Minus,
    Sparkles
  } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import CanvasAssistantWorkspace from '$lib/components/canvas/chat/CanvasAssistantWorkspace.svelte'
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
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
        {
          duration: 240,
          easing: 'cubic-bezier(0.55, 0, 0.55, 0.2)',
          fill: 'forwards'
        }
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

  async function animateDisplayModeChange(changeMode: () => void) {
    const el = windowEl
    if (!el || reducedMotion) {
      changeMode()
      return
    }

    activeAnimation?.cancel()
    const from = el.getBoundingClientRect()
    changeMode()
    await tick()
    const to = el.getBoundingClientRect()

    el.style.transformOrigin = 'top left'
    activeAnimation = el.animate(
      [
        { transform: flipTransform(from, to), opacity: 0.92 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
    await activeAnimation.finished.catch(() => undefined)
  }

  function maximize() {
    void animateDisplayModeChange(() => store.maximize())
  }

  function restoreCompact() {
    void animateDisplayModeChange(() => store.restoreCompact())
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.key !== 'Escape') return
    if (!store.open || !fullscreen) return
    event.preventDefault()
    restoreCompact()
  }

  const fullscreen = $derived(store.displayMode === 'fullscreen')
  const windowClass = $derived(
    fullscreen
      ? 'fixed inset-0 z-50 flex-col overflow-hidden bg-background text-foreground'
      : 'glass-card fixed bottom-6 right-6 z-40 h-[min(35rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-3rem))] cursor-auto flex-col overflow-hidden'
  )

  const tabClass = (active: boolean) =>
    `flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition ${
      active
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
  bind:this={windowEl}
  class={windowClass}
  style:display={store.open ? 'flex' : 'none'}
  role="dialog"
  aria-label="Canvas chat"
  data-camera-exempt
>
  <header
    class="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5"
  >
    {#if fullscreen}
      <div class="flex min-w-0 items-center gap-2">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Sparkles class="size-4" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="m-0 text-sm font-semibold text-foreground">Assistant</p>
          <p class="m-0 truncate text-xs text-muted-foreground">
            {store.assistantActiveThread?.title ?? 'New chat'}
          </p>
        </div>
      </div>
    {:else}
      <div
        class="flex items-center gap-1"
        role="tablist"
        aria-label="Chat tabs"
      >
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
    {/if}

    <div class="flex items-center gap-1">
      {#if fullscreen}
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onclick={restoreCompact}
          aria-label="Return to compact chat"
          title="Return to compact chat"
        >
          <Minimize2 class="size-4" aria-hidden="true" />
        </button>
      {:else if store.activeTab === 'assistant'}
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onclick={maximize}
          aria-label="Maximize chat"
          title="Maximize chat"
        >
          <Maximize2 class="size-4" aria-hidden="true" />
        </button>
      {/if}
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        onclick={() => void minimize()}
        aria-label="Minimize chat"
        title="Minimize chat"
      >
        <Minus class="size-4" aria-hidden="true" />
      </button>
    </div>
  </header>

  {#if fullscreen}
    <div class="min-h-0 flex-1">
      <CanvasAssistantWorkspace {canvasId} />
    </div>
  {:else}
    <!-- Both panels stay mounted so tab switches keep scroll positions and a
         streaming assistant turn keeps running in the background. -->
    <div class={store.activeTab === 'chat' ? 'min-h-0 flex-1' : 'hidden'}>
      <CanvasChatRoomPanel {userId} />
    </div>
    <div class={store.activeTab === 'assistant' ? 'min-h-0 flex-1' : 'hidden'}>
      <CanvasAssistantWorkspace {canvasId} />
    </div>
  {/if}
</div>
