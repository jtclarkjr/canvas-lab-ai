<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    ChevronDown,
    House,
    LayoutGrid,
    Link,
    Menu,
    MessageCircle,
    PenLine,
    Share2,
    Workflow as WorkflowIcon
  } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { cubicOut } from 'svelte/easing'
  import { fade, fly, slide } from 'svelte/transition'
  import type { Canvas } from '$lib/canvas/schema'
  import type { WorkspaceMode } from '$lib/scenes/types'
  import { toast } from '$lib/stores/shared/toast.svelte'
  import { useCanvasChatStoreOptional } from '$lib/stores/chat/canvas-chat.svelte'
  import ConferenceCallButton from '$lib/components/canvas/conference/controls/ConferenceCallButton.svelte'

  let {
    canvases,
    activeCanvasId,
    currentTitle,
    canManageCanvas,
    isLoadingCanvases,
    showNavigation = true,
    canvasId,
    mode,
    workflowEnabled = false,
    pendingCount = 0,
    onShare,
    onTitleSave,
    onModeChange
  } = $props<{
    canvases: Canvas[]
    activeCanvasId: string
    currentTitle: string
    canManageCanvas: boolean
    isLoadingCanvases: boolean
    showNavigation?: boolean
    canvasId: string
    mode: WorkspaceMode
    workflowEnabled?: boolean
    pendingCount?: number
    onShare: () => void
    onTitleSave: (title: string) => void | Promise<void>
    onModeChange: (mode: WorkspaceMode) => void
  }>()

  let titleInputEl = $state<HTMLInputElement | null>(null)
  let mobileMenuEl = $state<HTMLDivElement | null>(null)
  let canvasesOpen = $state(false)
  let mobileMenuOpen = $state(false)
  let isEditingTitle = $state(false)
  let editedTitle = $state('')

  const chatStore = useCanvasChatStoreOptional()
  const recentCanvases = $derived(canvases.slice(0, 3))
  const hasMenuNotifications = $derived(
    pendingCount > 0 || (chatStore?.unreadCount ?? 0) > 0
  )
  const modeItems = $derived([
    { id: 'editor' as WorkspaceMode, label: 'Editor', icon: PenLine },
    { id: 'scenes' as WorkspaceMode, label: 'Scenes', icon: LayoutGrid },
    ...(workflowEnabled
      ? [
          {
            id: 'workflows' as WorkspaceMode,
            label: 'Workflows',
            icon: WorkflowIcon
          }
        ]
      : [])
  ])

  onMount(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuEl &&
        event.target instanceof Node &&
        !mobileMenuEl.contains(event.target)
      ) {
        mobileMenuOpen = false
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  })

  function beginTitleEdit() {
    if (!canManageCanvas) {
      return
    }

    editedTitle = currentTitle
    isEditingTitle = true
    queueMicrotask(() => {
      titleInputEl?.focus()
      titleInputEl?.select()
    })
  }

  async function saveTitle() {
    if (!editedTitle.trim()) {
      isEditingTitle = false
      return
    }

    await onTitleSave(editedTitle.trim())
    isEditingTitle = false
  }

  function copyLink() {
    const url = `${window.location.origin}/canvas/${canvasId}`
    void navigator.clipboard.writeText(url).then(() => {
      toast.show({
        title: 'Link copied',
        description: 'People with the link must request access.'
      })
    })
    mobileMenuOpen = false
  }
</script>

<div
  class="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
  data-camera-exempt
>
  <div class="flex items-start justify-between">
    <div bind:this={mobileMenuEl} class="pointer-events-auto relative">
      <button
        type="button"
        class="toolbar-pill relative flex size-11 items-center justify-center"
        onclick={() => {
          mobileMenuOpen = !mobileMenuOpen
        }}
        aria-label={hasMenuNotifications
          ? 'Open canvas menu, notifications available'
          : 'Open canvas menu'}
        aria-expanded={mobileMenuOpen}
        aria-haspopup="menu"
      >
        <Menu class="size-5" aria-hidden="true" />
        {#if hasMenuNotifications}
          <span
            class="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-warning ring-2 ring-background"
            aria-hidden="true"
          ></span>
        {/if}
      </button>

      {#if mobileMenuOpen}
        <div
          class="absolute left-0 top-12 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-2xl"
          role="menu"
          transition:fly={{ y: -8, duration: 160, easing: cubicOut }}
        >
          <div class="border-b border-border/70 p-2">
            {#if isEditingTitle}
              <input
                bind:this={titleInputEl}
                class="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                bind:value={editedTitle}
                aria-label="Canvas title"
                onblur={() => void saveTitle()}
                onkeydown={(event) => {
                  if (event.key === 'Enter') {
                    void saveTitle()
                  } else if (event.key === 'Escape') {
                    isEditingTitle = false
                  }
                }}
              />
            {:else}
              <button
                type="button"
                class="w-full truncate rounded-lg px-2 py-2 text-left text-sm font-semibold text-popover-foreground transition hover:bg-secondary"
                onclick={beginTitleEdit}
                disabled={!canManageCanvas}
                aria-label={`Canvas title: ${currentTitle || 'Canvas'}`}
              >
                {currentTitle || 'Canvas'}
              </button>
            {/if}
          </div>

          <div class="flex flex-col gap-1 p-2">
            {#if showNavigation}
              <a
                href="/"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                role="menuitem"
              >
                <House class="size-4" aria-hidden="true" />
                Dashboard
              </a>
            {/if}

            {#if showNavigation}
              <div class="border-t border-border/60 pt-1">
                <div class="grid grid-cols-3 gap-1 px-1 py-1">
                  {#each modeItems as item (item.id)}
                    <button
                      type="button"
                      class={`flex h-10 min-w-0 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition ${
                        mode === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                      onclick={() => {
                        mobileMenuOpen = false
                        onModeChange(item.id)
                      }}
                      aria-pressed={mode === item.id}
                    >
                      <item.icon class="size-4 shrink-0" aria-hidden="true" />
                      <span class="truncate">{item.label}</span>
                    </button>
                  {/each}
                </div>

                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                  onclick={() => (canvasesOpen = !canvasesOpen)}
                  aria-label="Show recent canvases"
                  aria-expanded={canvasesOpen}
                >
                  <ChevronDown
                    class={`size-4 shrink-0 transition-transform duration-200 ${
                      canvasesOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1 text-left">Canvases</span>
                  <span class="text-xs text-muted-foreground">Last 3</span>
                </button>

                {#if canvasesOpen}
                  <div
                    class="overflow-hidden pb-1 pl-2"
                    transition:slide={{
                      duration: 180,
                      axis: 'y',
                      easing: cubicOut
                    }}
                  >
                    <div transition:fade={{ duration: 120 }}>
                      {#if recentCanvases.length > 0}
                        {#each recentCanvases as canvas (canvas.id)}
                          <button
                            type="button"
                            class={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                              canvas.id === activeCanvasId
                                ? 'bg-primary text-primary-foreground'
                                : 'text-popover-foreground hover:bg-secondary'
                            }`}
                            role="menuitem"
                            onclick={() => {
                              mobileMenuOpen = false
                              canvasesOpen = false
                              if (canvas.id !== activeCanvasId) {
                                void goto(`/canvas/${canvas.id}`)
                              }
                            }}
                          >
                            {canvas.title.trim() || 'Untitled canvas'}
                          </button>
                        {/each}
                      {:else if isLoadingCanvases}
                        <div class="px-3 py-2 text-sm text-muted-foreground">
                          Loading canvases...
                        </div>
                      {:else}
                        <div class="px-3 py-2 text-sm text-muted-foreground">
                          No canvases yet
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                class="toolbar-pill toolbar-button relative"
                onclick={() => {
                  mobileMenuOpen = false
                  onShare()
                }}
                aria-label="Share canvas"
              >
                <Share2 class="size-4" aria-hidden="true" />
                {#if pendingCount > 0}
                  <span
                    class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
                  >
                    {pendingCount}
                  </span>
                {/if}
              </button>

              <button
                type="button"
                class="toolbar-pill toolbar-button"
                onclick={copyLink}
                aria-label="Copy canvas link"
              >
                <Link class="size-4" aria-hidden="true" />
              </button>

              <ConferenceCallButton />

              {#if chatStore}
                <button
                  type="button"
                  class="toolbar-pill toolbar-button relative"
                  onclick={() => {
                    mobileMenuOpen = false
                    chatStore.openWindow()
                  }}
                  aria-label={chatStore.unreadCount > 0
                    ? `Open canvas chat (${chatStore.unreadCount} unread)`
                    : 'Open canvas chat'}
                >
                  <MessageCircle class="size-4" aria-hidden="true" />
                  {#if chatStore.unreadCount > 0}
                    <span
                      class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
                    >
                      {chatStore.unreadCount > 9 ? '9+' : chatStore.unreadCount}
                    </span>
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>

    {#if workflowEnabled}
      <button
        type="button"
        class={`pointer-events-auto toolbar-pill relative flex size-11 items-center justify-center transition ${
          mode === 'workflows'
            ? 'border-primary/60 bg-primary text-primary-foreground'
            : ''
        }`}
        onclick={() =>
          onModeChange(mode === 'workflows' ? 'editor' : 'workflows')}
        aria-label={mode === 'workflows'
          ? 'Return to editor mode'
          : 'Open workflows'}
        aria-pressed={mode === 'workflows'}
      >
        <WorkflowIcon class="size-5" aria-hidden="true" />
      </button>
    {/if}
  </div>
</div>
