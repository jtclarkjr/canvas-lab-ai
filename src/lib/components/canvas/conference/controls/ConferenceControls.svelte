<script lang="ts">
  import {
    LayoutGrid,
    LayoutPanelLeft,
    LayoutPanelTop,
    LoaderCircle,
    MessageSquare,
    Minimize2,
    MonitorUp,
    MonitorX,
    PhoneOff,
    Users,
    Volume2
  } from 'lucide-svelte'
  import type { ConferenceLayoutMode } from '$lib/conference/types'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import ConferenceMicButton from './ConferenceMicButton.svelte'
  import ConferenceCamButton from './ConferenceCamButton.svelte'
  import ConferenceCCButton from './ConferenceCCButton.svelte'
  import ConferenceMeetingToolsButton from './ConferenceMeetingToolsButton.svelte'

  const store = useCanvasConferenceStore()
  const chatStore = useCanvasChatStore()
  const chatUnreadCount = $derived(
    chatStore.unreadCount + store.callChatUnreadCount
  )

  const panelToggleClass = (active: boolean) =>
    `relative flex size-10 items-center justify-center rounded-full transition ${
      active
        ? 'bg-primary/15 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`

  let layoutPickerOpen = $state(false)

  $effect(() => {
    if (!layoutPickerOpen) return
    const close = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-layout-picker]')) layoutPickerOpen = false
    }
    document.addEventListener('click', close, { capture: true })
    return () => document.removeEventListener('click', close, { capture: true })
  })

  function selectLayout(mode: ConferenceLayoutMode) {
    store.setLayoutMode(mode)
    layoutPickerOpen = false
  }

  const LAYOUTS: { mode: ConferenceLayoutMode; label: string }[] = [
    { mode: 'auto', label: 'Grid' },
    { mode: 'spotlight', label: 'Spotlight' },
    { mode: 'sidebar', label: 'Sidebar' }
  ]
</script>

<div
  class="flex items-center justify-between gap-4 border-t border-border/60 px-4 py-3"
>
  <div
    class="flex w-52 items-center gap-2 text-sm font-semibold text-muted-foreground"
  >
    {#if store.status === 'reconnecting'}
      <LoaderCircle class="size-4 animate-spin" />
      Reconnecting…
    {:else}
      Call · {store.participants.length}
    {/if}
  </div>

  <div class="flex items-center gap-2">
    {#if !store.canPlayAudio}
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-full bg-warning px-3 py-2 text-xs font-bold text-warning-foreground shadow"
        onclick={() => void store.startAudio()}
      >
        <Volume2 class="size-4" />
        Tap to unmute call
      </button>
    {/if}

    <ConferenceMicButton />
    <ConferenceCamButton />

    <button
      type="button"
      class={`flex size-11 items-center justify-center rounded-full transition ${
        store.screenEnabled
          ? 'bg-primary/15 text-primary'
          : 'bg-secondary text-foreground hover:bg-muted'
      }`}
      onclick={() => void store.toggleScreenShare()}
      title={store.screenEnabled ? 'Stop presenting' : 'Present screen'}
      aria-label={store.screenEnabled ? 'Stop presenting' : 'Present screen'}
      aria-pressed={store.screenEnabled}
    >
      {#if store.screenEnabled}
        <MonitorX class="size-5" />
      {:else}
        <MonitorUp class="size-5" />
      {/if}
    </button>

    <ConferenceCCButton />
    <ConferenceMeetingToolsButton />

    <div class="relative" data-layout-picker>
      {#if layoutPickerOpen}
        <div
          class="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 flex flex-col gap-1 rounded-2xl border border-border/60 bg-popover p-2 shadow-lg"
          role="menu"
          aria-label="Change layout"
        >
          {#each LAYOUTS as layout (layout.mode)}
            <button
              type="button"
              class={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                store.layoutMode === layout.mode
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
              onclick={() => selectLayout(layout.mode)}
              role="menuitemradio"
              aria-checked={store.layoutMode === layout.mode}
            >
              {#if layout.mode === 'auto'}
                <LayoutGrid class="size-4 shrink-0" />
              {:else if layout.mode === 'spotlight'}
                <LayoutPanelTop class="size-4 shrink-0" />
              {:else}
                <LayoutPanelLeft class="size-4 shrink-0" />
              {/if}
              <span class="whitespace-nowrap font-medium">{layout.label}</span>
            </button>
          {/each}
        </div>
      {/if}
      <button
        type="button"
        class={`flex size-11 items-center justify-center rounded-full transition ${
          layoutPickerOpen
            ? 'bg-primary/15 text-primary'
            : 'bg-secondary text-foreground hover:bg-muted'
        }`}
        onclick={() => (layoutPickerOpen = !layoutPickerOpen)}
        title="Change layout"
        aria-label="Change layout"
        aria-expanded={layoutPickerOpen}
        aria-haspopup="menu"
      >
        <LayoutGrid class="size-5" />
      </button>
    </div>

    <button
      type="button"
      class="flex h-11 items-center justify-center rounded-full bg-destructive px-5 text-destructive-foreground transition hover:opacity-90"
      onclick={() => void store.leave()}
      title="Leave call"
      aria-label="Leave call"
    >
      <PhoneOff class="size-5" />
    </button>
  </div>

  <div class="flex w-52 items-center justify-end gap-1.5">
    <button
      type="button"
      class={panelToggleClass(store.fullscreenPanel === 'people')}
      onclick={() => store.toggleFullscreenPanel('people')}
      title="People in call"
      aria-label="People in call"
      aria-pressed={store.fullscreenPanel === 'people'}
    >
      <Users class="size-5" />
    </button>
    <button
      type="button"
      class={panelToggleClass(store.fullscreenPanel === 'chat')}
      onclick={() => store.toggleFullscreenPanel('chat')}
      title="Chat"
      aria-label="Chat"
      aria-pressed={store.fullscreenPanel === 'chat'}
    >
      <MessageSquare class="size-5" />
      {#if chatUnreadCount > 0 && store.fullscreenPanel !== 'chat'}
        <span
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
        >
          {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
        </span>
      {/if}
    </button>
    <button
      type="button"
      class="flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      onclick={() => store.setViewMode('pip')}
      title="Exit full screen"
      aria-label="Exit full screen"
    >
      <Minimize2 class="size-5" />
    </button>
  </div>
</div>
