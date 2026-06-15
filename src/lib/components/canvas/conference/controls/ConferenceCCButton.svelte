<script lang="ts">
  import { ClosedCaption, LoaderCircle } from 'lucide-svelte'
  import {
    CAPTION_LANGUAGES,
    CAPTION_TEXT_COLORS,
    CAPTION_TEXT_SIZES,
    captionTextColorValue,
    type CaptionLanguageCode,
    type CaptionTextSize
  } from '$lib/conference/captions'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()

  let now = $state(Date.now())
  $effect(() => {
    if (!store.captionsEnabled) return
    const timer = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => clearInterval(timer)
  })

  const CAPTION_VISIBLE_MS = 8000
  const visibleCaptions = $derived(
    store.captionSegments
      .filter(
        (s) => s.translated !== null && now - s.receivedAt < CAPTION_VISIBLE_MS
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

  let settingsHovered = $state(false)

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
</script>

{#if store.captionsEnabled && visibleCaptions.length > 0}
  <div
    class={`pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 transition-transform duration-200 ease-out ${settingsHovered ? '-translate-y-14' : 'translate-y-0'}`}
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

<div
  class="group/cc relative"
  role="group"
  aria-label="Captions controls"
  onmouseenter={() => (settingsHovered = true)}
  onmouseleave={() => (settingsHovered = false)}
>
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
              <span class={`font-bold ${captionSizePreviewClass(entry.code)}`}>
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
    title={store.captionsEnabled ? 'Turn off captions' : 'Turn on captions'}
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
