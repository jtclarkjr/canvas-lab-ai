<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  import { MessageSquare, Sparkles } from 'lucide-svelte'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import MobileCanvasAssistantPanel from '$lib/mobile/components/chat/MobileCanvasAssistantPanel.svelte'
  import MobileCanvasChatRoomPanel from '$lib/mobile/components/chat/MobileCanvasChatRoomPanel.svelte'

  let { canvasId, userId } = $props<{
    canvasId: string
    userId: string
  }>()

  const store = useCanvasChatStore()
  let dragPointerId: number | null = null
  let dragStartX = 0
  let dragStartY = 0
  let dragStartScrollable: HTMLElement | null = null
  let dragActive = false
  let dragY = $state(0)
  let dragging = $state(false)

  const sheetStyle = $derived(`transform:translateY(${dragY}px)`)
  const tabClass = (active: boolean) =>
    `relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
      active ? 'bg-foreground text-background' : 'text-muted-foreground'
    }`

  function close() {
    dragY = 0
    store.minimize()
  }

  function closestScrollable(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return null
    }

    let current: HTMLElement | null = target
    while (current) {
      const style = window.getComputedStyle(current)
      const canScroll =
        /(auto|scroll)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight

      if (canScroll) {
        return current
      }

      if (current.getAttribute('role') === 'dialog') {
        return null
      }

      current = current.parentElement
    }

    return null
  }

  function handleDragStart(event: PointerEvent) {
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY - dragY
    dragStartScrollable = closestScrollable(event.target)
    dragActive = false
    dragging = false
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return

    const deltaX = event.clientX - dragStartX
    const deltaY = event.clientY - dragStartY

    if (!dragActive) {
      if (
        deltaY <= 10 ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        (dragStartScrollable && dragStartScrollable.scrollTop > 0)
      ) {
        return
      }

      dragActive = true
      dragging = true
    }

    event.preventDefault()
    dragY = Math.max(0, deltaY)
  }

  function handleDragEnd(event: PointerEvent) {
    if (event.pointerId !== dragPointerId) return
    dragging = false
    dragActive = false
    dragStartScrollable = null
    dragPointerId = null

    if (dragY > 80) {
      close()
      return
    }

    dragY = 0
  }
</script>

{#if store.open}
  <div
    class="fixed inset-0 z-50"
    transition:fade={{ duration: 120 }}
    data-camera-exempt
  >
    <button
      type="button"
      class="absolute inset-0 bg-black/30"
      onclick={close}
      aria-label="Close canvas chat"
    ></button>

    <div
      class={`absolute inset-x-0 bottom-0 z-10 flex h-[94dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] min-h-[20rem] flex-col overflow-hidden rounded-t-2xl border border-border/70 bg-card text-card-foreground shadow-2xl ${
        dragging ? '' : 'transition-transform duration-150'
      }`}
      style={sheetStyle}
      role="dialog"
      aria-label="Canvas chat"
      tabindex="-1"
      transition:fly={{ y: 36, duration: 180, easing: cubicOut }}
      onpointerdown={handleDragStart}
      onpointermove={handleDragMove}
      onpointerup={handleDragEnd}
      onpointercancel={handleDragEnd}
    >
      <header class="shrink-0 border-b border-border/60 px-4 pb-3 pt-2">
        <button
          type="button"
          class="mx-auto mb-3 block h-5 w-16 rounded-full"
          aria-label="Drag down to close canvas chat"
        >
          <span
            class="mx-auto block h-1 w-10 rounded-full bg-muted-foreground/30"
          ></span>
        </button>

        <div
          class="flex rounded-full bg-muted/50 p-1"
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
            <MessageSquare class="size-3.5" aria-hidden="true" />
            Chat
            {#if store.unreadCount > 0 && store.activeTab !== 'chat'}
              <span
                class="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
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
            <Sparkles class="size-3.5" aria-hidden="true" />
            Assistant
          </button>
        </div>
      </header>

      <div class={store.activeTab === 'chat' ? 'min-h-0 flex-1' : 'hidden'}>
        <MobileCanvasChatRoomPanel {userId} />
      </div>
      <div
        class={store.activeTab === 'assistant' ? 'min-h-0 flex-1' : 'hidden'}
      >
        <MobileCanvasAssistantPanel {canvasId} />
      </div>
    </div>
  </div>
{/if}
