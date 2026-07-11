<script lang="ts">
  import {
    ChartBar,
    CircleAlert,
    CircleCheck,
    Ellipsis,
    FileText,
    Languages,
    LoaderCircle,
    MessageSquare,
    Radio,
    Timer,
    Wrench,
    X
  } from 'lucide-svelte'
  import Popover from '$lib/components/shared/Popover.svelte'
  import { useCanvasConferenceStore } from '$lib/stores/conference/index.svelte'

  const store = useCanvasConferenceStore()
  let open = $state(false)

  const canStartTranscription = $derived(
    store.callTranscriptionStatus === 'not_requested' ||
      store.callTranscriptionStatus === 'failed'
  )

  const transcriptStatusText = $derived.by(() => {
    switch (store.callTranscriptionStatus) {
      case 'starting':
        return 'Transcription requested'
      case 'active':
        return 'Capturing transcript'
      case 'processing':
        return 'Processing after call'
      case 'ready':
        return 'Transcript ready'
      case 'no_speech':
        return 'No speech captured'
      case 'failed':
        return 'Start again'
      default:
        return 'Capture the conversation'
    }
  })

  const futureTools = [
    {
      label: 'Speech translation',
      description: 'Translate live speech',
      icon: Languages
    },
    {
      label: 'Timer',
      description: 'Show a countdown timer',
      icon: Timer
    },
    {
      label: 'Record',
      description: 'Capture the meeting',
      icon: Radio
    },
    {
      label: 'Polls',
      description: 'Send polls to the audience',
      icon: ChartBar
    },
    {
      label: 'Q&A',
      description: 'Ask and answer questions',
      icon: MessageSquare
    }
  ] as const

  function handleTranscribeClick() {
    if (!canStartTranscription || store.transcriptionStarting) {
      return
    }
    void store.startTranscription()
  }
</script>

<Popover
  id="conference-meeting-tools"
  label="Meeting tools"
  role="menu"
  align="center"
  side="top"
  bind:open
>
  {#snippet trigger({ id, expanded })}
    <button
      type="button"
      class={`flex size-11 items-center justify-center rounded-full transition ${
        expanded
          ? 'bg-primary/15 text-primary'
          : 'bg-secondary text-foreground hover:bg-muted'
      }`}
      onclick={() => (open = !open)}
      title="Meeting tools"
      aria-label="Meeting tools"
      aria-controls={id}
      aria-expanded={expanded}
      aria-haspopup="menu"
    >
      <Wrench class="size-5" aria-hidden="true" />
    </button>
  {/snippet}

  <div class="w-[min(22rem,calc(100vw-2rem))] p-3">
    <div class="mb-3 flex items-center justify-between gap-3 px-1">
      <div class="flex items-center gap-2">
        <Ellipsis class="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 class="text-sm font-semibold text-popover-foreground">
          Meeting tools
        </h2>
      </div>
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-popover-foreground"
        onclick={() => (open = false)}
        aria-label="Close meeting tools"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl bg-secondary px-3 py-3 text-left text-popover-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
        onclick={handleTranscribeClick}
        disabled={!canStartTranscription || store.transcriptionStarting}
        role="menuitem"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-primary"
        >
          {#if store.transcriptionStarting || store.callTranscriptionStatus === 'starting'}
            <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
          {:else if store.callTranscriptionStatus === 'ready'}
            <CircleCheck class="size-4" aria-hidden="true" />
          {:else if store.callTranscriptionStatus === 'failed'}
            <CircleAlert class="size-4" aria-hidden="true" />
          {:else}
            <FileText class="size-4" aria-hidden="true" />
          {/if}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">Transcribe</span>
          <span class="block truncate text-xs text-muted-foreground">
            {transcriptStatusText}
          </span>
        </span>
      </button>

      <p
        class="px-1 pt-2 text-xs font-semibold uppercase text-muted-foreground"
      >
        Coming later
      </p>
      {#each futureTools as tool (tool.label)}
        {@const ToolIcon = tool.icon}
        <button
          type="button"
          class="flex w-full cursor-not-allowed items-center gap-3 rounded-xl bg-secondary/55 px-3 py-3 text-left text-muted-foreground opacity-75"
          disabled
          role="menuitem"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/70"
          >
            <ToolIcon class="size-4" aria-hidden="true" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">
              {tool.label}
            </span>
            <span class="block truncate text-xs">{tool.description}</span>
          </span>
        </button>
      {/each}
    </div>
  </div>
</Popover>
