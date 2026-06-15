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
    onModeChange,
    onShare,
    onTitleSave
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
    onModeChange: (mode: WorkspaceMode) => void
    onShare: () => void
    onTitleSave: (title: string) => void | Promise<void>
  }>()

  let titleInputEl = $state<HTMLInputElement | null>(null)
  let dropdownEl = $state<HTMLDivElement | null>(null)
  let mobileMenuEl = $state<HTMLDivElement | null>(null)
  let showCanvasSelector = $state(false)
  let mobileMenuOpen = $state(false)
  let isEditingTitle = $state(false)
  let editedTitle = $state('')

  const chatStore = useCanvasChatStoreOptional()
  const modeOptions = $derived([
    { id: 'editor' as WorkspaceMode, icon: PenLine, label: 'Editor' },
    { id: 'scenes' as WorkspaceMode, icon: LayoutGrid, label: 'Scenes' },
    ...(workflowEnabled
      ? [
          {
            id: 'workflows' as WorkspaceMode,
            icon: WorkflowIcon,
            label: 'Workflows'
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

      if (
        dropdownEl &&
        event.target instanceof Node &&
        !dropdownEl.contains(event.target)
      ) {
        showCanvasSelector = false
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

  function selectMode(nextMode: WorkspaceMode) {
    onModeChange(nextMode)
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
        class="toolbar-pill flex size-11 items-center justify-center"
        onclick={() => {
          mobileMenuOpen = !mobileMenuOpen
          showCanvasSelector = false
        }}
        aria-label="Open canvas menu"
        aria-expanded={mobileMenuOpen}
        aria-haspopup="menu"
      >
        <Menu class="size-5" aria-hidden="true" />
      </button>

      {#if mobileMenuOpen}
        <div
          class="absolute left-0 top-12 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-2xl"
          role="menu"
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

            <div class="grid grid-cols-3 gap-1 rounded-lg bg-secondary/70 p-1">
              {#each modeOptions as entry (entry.id)}
                <button
                  type="button"
                  class={`flex h-10 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition ${
                    mode === entry.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                  onclick={() => selectMode(entry.id)}
                  aria-label={`Switch to ${entry.label} mode`}
                  aria-pressed={mode === entry.id}
                >
                  <entry.icon class="size-4" aria-hidden="true" />
                  <span>{entry.label}</span>
                </button>
              {/each}
            </div>

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

    {#if showNavigation}
      <div bind:this={dropdownEl} class="pointer-events-auto relative">
        <button
          type="button"
          class="toolbar-pill flex size-11 items-center justify-center"
          onclick={() => {
            showCanvasSelector = !showCanvasSelector
            mobileMenuOpen = false
          }}
          aria-label="Switch canvas"
          aria-expanded={showCanvasSelector}
          aria-haspopup="menu"
        >
          <ChevronDown class="size-4" aria-hidden="true" />
        </button>
      </div>
    {/if}
  </div>

  {#if showCanvasSelector && showNavigation}
    <div
      class="pointer-events-auto fixed right-3 top-[calc(env(safe-area-inset-top)+4.5rem)] max-h-[min(22rem,60dvh)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-border/70 bg-popover p-1 text-popover-foreground shadow-2xl"
      role="menu"
    >
      {#if canvases.length > 0}
        {#each canvases as canvas}
          <button
            type="button"
            class={`w-full rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
              canvas.id === activeCanvasId
                ? 'bg-primary text-primary-foreground'
                : 'text-popover-foreground'
            }`}
            role="menuitem"
            onclick={() => {
              showCanvasSelector = false
              if (canvas.id !== activeCanvasId) {
                void goto(`/canvas/${canvas.id}`)
              }
            }}
          >
            {canvas.title.trim() || 'Untitled canvas'}
          </button>
        {/each}
      {:else if isLoadingCanvases}
        <div class="px-3 py-3 text-sm text-muted-foreground">
          Loading canvases...
        </div>
      {:else}
        <div class="px-3 py-3 text-sm text-muted-foreground">
          No canvases yet
        </div>
      {/if}
    </div>
  {/if}
</div>
