<script lang="ts">
  import { fade } from 'svelte/transition'
  import {
    ClosedCaption,
    LoaderCircle,
    MessageSquare,
    Mic,
    MicOff,
    Minimize2,
    PhoneOff,
    Pin,
    Settings,
    Users,
    Video,
    VideoOff,
    Volume2,
    X
  } from 'lucide-svelte'
  import {
    CAPTION_LANGUAGES,
    CAPTION_TEXT_COLORS,
    CAPTION_TEXT_SIZES,
    captionTextColorValue,
    type CaptionLanguageCode,
    type CaptionTextSize
  } from '$lib/conference/captions'
  import { useCanvasChatStore } from '$lib/stores/chat/canvas-chat.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'
  import CanvasChatRoomPanel from '$lib/components/canvas/chat/CanvasChatRoomPanel.svelte'
  import { attachTrack } from '$lib/components/canvas/conference/media-actions'

  const store = useCanvasConferenceStore()
  const chatStore = useCanvasChatStore()

  // Caption lines fade out after a quiet spell; a coarse clock is enough.
  let now = $state(Date.now())
  $effect(() => {
    if (!store.captionsEnabled) {
      return
    }
    const timer = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => clearInterval(timer)
  })

  const CAPTION_VISIBLE_MS = 8000
  // Only lines that already exist in the viewer's target language render —
  // the original language never flashes first.
  const visibleCaptions = $derived(
    store.captionSegments
      .filter(
        (segment) =>
          segment.translated !== null &&
          now - segment.receivedAt < CAPTION_VISIBLE_MS
      )
      .slice(-2)
  )

  function captionFontSizeFor(size: CaptionTextSize) {
    switch (size) {
      case 'small':
        return '0.75rem'
      case 'large':
        return '1rem'
      default:
        return '0.875rem'
    }
  }

  const captionFontSize = $derived(captionFontSizeFor(store.captionTextSize))
  const captionTextColor = $derived(
    captionTextColorValue(store.captionTextColor)
  )

  // Escape exits full screen back to the PiP — unless the settings modal is
  // open, in which case Escape belongs to the modal.
  $effect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !store.settingsOpen) {
        store.setViewMode('pip')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // The chat panel reads the same store as the chat window; load it without
  // opening the window and keep the unread badge clear while visible here.
  $effect(() => {
    if (store.fullscreenPanel === 'chat') {
      void chatStore.ensureLoaded()
    }
  })

  $effect(() => {
    void chatStore.entries.length
    if (store.fullscreenPanel === 'chat') {
      chatStore.markChatRead()
    }
  })

  const panelToggleClass = (active: boolean) =>
    `relative flex size-10 items-center justify-center rounded-full transition ${
      active
        ? 'bg-primary/15 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`

  const captionSizeButtonClass = (active: boolean) =>
    `flex size-7 items-center justify-center rounded-md transition ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`

  function captionSizePreviewClass(size: CaptionTextSize) {
    switch (size) {
      case 'small':
        return 'text-[10px]'
      case 'large':
        return 'text-sm'
      default:
        return 'text-xs'
    }
  }

  const captionColorButtonClass = (active: boolean) =>
    `size-5 rounded-full border transition ${
      active
        ? 'border-primary ring-2 ring-primary/30'
        : 'border-border hover:border-primary/60'
    }`

  let ccSettingsHovered = $state(false)
</script>

<div
  class="fixed inset-0 z-50 flex flex-col bg-background"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-label="Call"
  data-camera-exempt
>
  <!-- Live captions: only visible when speech is active. -->
  {#if store.captionsEnabled && visibleCaptions.length > 0}
    <div
      class={`pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-6 transition-transform duration-200 ease-out ${ccSettingsHovered ? '-translate-y-14' : 'translate-y-0'}`}
    >
      <div
        class="pointer-events-auto max-w-2xl rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-white backdrop-blur-2xl"
        aria-live="polite"
      >
        {#each visibleCaptions as segment (segment.id)}
          <p
            class="leading-snug"
            style={`font-size:${captionFontSize};color:${captionTextColor}`}
          >
            <span class="font-bold" style={`color:${segment.speakerColor}`}>
              {segment.speakerName}:
            </span>
            <span>{segment.translated ?? segment.text}</span>
          </p>
        {/each}
      </div>
    </div>
  {/if}
  <div class="flex min-h-0 flex-1">
    <!-- Tile grid -->
    <div class="min-h-0 flex-1 overflow-y-auto p-4">
      <div
        class="participant-tile-grid mx-auto grid h-full w-full max-w-6xl content-center gap-3"
      >
        {#each store.participants as participant (participant.identity)}
          {@const pinned = store.pinnedIdentity === participant.identity}
          <button
            type="button"
            class={`relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary/60 text-left transition ${
              pinned
                ? 'ring-2 ring-primary'
                : participant.isSpeaking
                  ? 'ring-2 ring-success'
                  : ''
            }`}
            onclick={() => store.pin(participant.identity)}
            title={pinned ? 'Unpin' : 'Pin to the floating video'}
          >
            {#if participant.videoTrack && participant.camEnabled}
              <video
                use:attachTrack={participant.videoTrack}
                autoplay
                playsinline
                muted
                class={`h-full w-full object-cover ${participant.isLocal ? '-scale-x-100' : ''}`}
              ></video>
            {:else}
              <div class="flex h-full w-full items-center justify-center">
                <span
                  class="flex size-20 items-center justify-center rounded-full text-2xl font-bold shadow-inner"
                  style={`background-color:${participant.color};color:var(--canvas-avatar-foreground)`}
                >
                  {participant.name.trim().slice(0, 2).toUpperCase() || 'ME'}
                </span>
              </div>
            {/if}

            <span
              class="absolute bottom-2 left-2 flex max-w-[70%] items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur"
            >
              {#if pinned}
                <Pin class="size-3" />
              {/if}
              <span class="truncate">
                {participant.isLocal ? 'You' : participant.name}
              </span>
            </span>

            {#if !participant.micEnabled}
              <span
                class="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
              >
                <MicOff class="size-3" />
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Side panel -->
    {#if store.fullscreenPanel !== 'none'}
      <aside
        class="flex w-80 shrink-0 flex-col border-l border-border/60 bg-card"
        aria-label={store.fullscreenPanel === 'chat'
          ? 'Canvas chat'
          : 'People in call'}
      >
        <header
          class="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3"
        >
          <h2 class="text-sm font-bold text-foreground">
            {store.fullscreenPanel === 'chat'
              ? 'Canvas chat'
              : `People · ${store.participants.length}`}
          </h2>
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onclick={() =>
              store.toggleFullscreenPanel(
                store.fullscreenPanel === 'chat' ? 'chat' : 'people'
              )}
            title="Close panel"
            aria-label="Close panel"
          >
            <X class="size-4" />
          </button>
        </header>

        {#if store.fullscreenPanel === 'chat'}
          <div class="min-h-0 flex-1">
            <CanvasChatRoomPanel userId={store.userId} alwaysVisible />
          </div>
        {:else}
          <div class="min-h-0 flex-1 overflow-y-auto p-2">
            {#each store.participants as participant (participant.identity)}
              <div
                class="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/60"
              >
                <span
                  class={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-inner ${
                    participant.isSpeaking ? 'ring-2 ring-success' : ''
                  }`}
                  style={`background-color:${participant.color};color:var(--canvas-avatar-foreground)`}
                >
                  {participant.name.trim().slice(0, 2).toUpperCase() || 'ME'}
                </span>
                <span class="min-w-0 flex-1 truncate text-sm text-foreground">
                  {participant.isLocal ? 'You' : participant.name}
                </span>
                <button
                  type="button"
                  class={`flex size-7 items-center justify-center rounded-full transition ${
                    store.pinnedIdentity === participant.identity
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onclick={() => store.pin(participant.identity)}
                  title={store.pinnedIdentity === participant.identity
                    ? 'Unpin'
                    : 'Pin'}
                  aria-label={`Pin ${participant.isLocal ? 'yourself' : participant.name}`}
                >
                  <Pin class="size-3.5" />
                </button>
                <span
                  class={participant.micEnabled
                    ? 'text-muted-foreground'
                    : 'text-destructive'}
                >
                  {#if participant.micEnabled}
                    <Mic class="size-4" />
                  {:else}
                    <MicOff class="size-4" />
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </aside>
    {/if}
  </div>

  <!-- Bottom control bar -->
  <div
    class="flex items-center justify-between gap-4 border-t border-border/60 px-4 py-3"
  >
    <div
      class="flex w-40 items-center gap-2 text-sm font-semibold text-muted-foreground"
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

      <button
        type="button"
        class={`flex size-11 items-center justify-center rounded-full transition ${
          store.micEnabled
            ? 'bg-secondary text-foreground hover:bg-muted'
            : 'bg-destructive text-destructive-foreground'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        onclick={() => void store.toggleMic()}
        disabled={!store.hasMic}
        title={!store.hasMic
          ? 'No microphone found'
          : store.micEnabled
            ? 'Mute microphone'
            : 'Unmute microphone'}
        aria-label={store.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={store.micEnabled}
      >
        {#if store.micEnabled}
          <Mic class="size-5" />
        {:else}
          <MicOff class="size-5" />
        {/if}
      </button>

      <button
        type="button"
        class={`flex size-11 items-center justify-center rounded-full transition ${
          store.camEnabled
            ? 'bg-secondary text-foreground hover:bg-muted'
            : 'bg-destructive text-destructive-foreground'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        onclick={() => void store.toggleCam()}
        disabled={!store.hasCamera}
        title={!store.hasCamera
          ? 'No camera found'
          : store.camEnabled
            ? 'Turn camera off'
            : 'Turn camera on'}
        aria-label={store.camEnabled ? 'Turn camera off' : 'Turn camera on'}
        aria-pressed={store.camEnabled}
      >
        {#if store.camEnabled}
          <Video class="size-5" />
        {:else}
          <VideoOff class="size-5" />
        {/if}
      </button>

      <div
        class="group/cc relative"
        role="group"
        aria-label="Captions controls"
        onmouseenter={() => (ccSettingsHovered = true)}
        onmouseleave={() => (ccSettingsHovered = false)}
      >
        <!-- Settings popover — appears above CC button on hover -->
        {#if store.captionsEnabled}
          <div
            class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-150 group-hover/cc:pointer-events-auto group-hover/cc:opacity-100"
          >
            <div
              class="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-2xl"
              role="group"
              aria-label="Caption settings"
            >
              <select
                class="h-7 rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white outline-none backdrop-blur"
                value={store.captionsLanguage}
                onchange={(event) =>
                  store.setCaptionsLanguage(
                    event.currentTarget.value as CaptionLanguageCode
                  )}
                aria-label="Caption language"
                title="Caption language"
              >
                {#each CAPTION_LANGUAGES as entry (entry.code)}
                  <option value={entry.code}>{entry.label}</option>
                {/each}
              </select>

              <div
                class="flex items-center rounded-lg bg-white/10 p-0.5"
                role="group"
                aria-label="Caption size"
              >
                {#each CAPTION_TEXT_SIZES as entry (entry.code)}
                  <button
                    type="button"
                    class={captionSizeButtonClass(
                      store.captionTextSize === entry.code
                    )}
                    onclick={() => store.setCaptionTextSize(entry.code)}
                    title={`${entry.label} captions`}
                    aria-label={`${entry.label} captions`}
                    aria-pressed={store.captionTextSize === entry.code}
                  >
                    <span
                      class={`font-bold ${captionSizePreviewClass(entry.code)}`}
                    >
                      A
                    </span>
                  </button>
                {/each}
              </div>

              <div
                class="flex items-center gap-1"
                role="group"
                aria-label="Caption color"
              >
                {#each CAPTION_TEXT_COLORS as entry (entry.code)}
                  <button
                    type="button"
                    class={captionColorButtonClass(
                      store.captionTextColor === entry.code
                    )}
                    style={`background:${entry.value}`}
                    onclick={() => store.setCaptionTextColor(entry.code)}
                    title={`${entry.label} captions`}
                    aria-label={`${entry.label} captions`}
                    aria-pressed={store.captionTextColor === entry.code}
                  ></button>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <button
          type="button"
          class={`flex size-11 items-center justify-center rounded-full transition ${
            store.captionsEnabled
              ? 'bg-primary/15 text-primary'
              : 'bg-secondary text-foreground hover:bg-muted'
          }`}
          onclick={() => store.toggleCaptions()}
          title={store.captionsEnabled
            ? 'Turn off captions'
            : 'Turn on captions'}
          aria-label={store.captionsEnabled
            ? 'Turn off captions'
            : 'Turn on captions'}
          aria-pressed={store.captionsEnabled}
        >
          {#if store.captionsState === 'connecting'}
            <LoaderCircle class="size-5 animate-spin" />
          {:else}
            <ClosedCaption class="size-5" />
          {/if}
        </button>
      </div>

      <button
        type="button"
        class="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-muted"
        onclick={() => store.setSettingsOpen(true)}
        title="Call settings"
        aria-label="Call settings"
      >
        <Settings class="size-5" />
      </button>

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

    <div class="flex w-40 items-center justify-end gap-1.5">
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
        title="Canvas chat"
        aria-label="Canvas chat"
        aria-pressed={store.fullscreenPanel === 'chat'}
      >
        <MessageSquare class="size-5" />
        {#if chatStore.unreadCount > 0 && store.fullscreenPanel !== 'chat'}
          <span
            class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-warning-foreground"
          >
            {chatStore.unreadCount > 9 ? '9+' : chatStore.unreadCount}
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
</div>

<style>
  .participant-tile-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  }
</style>
