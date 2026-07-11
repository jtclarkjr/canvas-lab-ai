<script lang="ts">
  import { cubicOut } from 'svelte/easing'
  import { fade, fly } from 'svelte/transition'
  import {
    CircleAlert,
    CircleCheck,
    FileText,
    ListChecks,
    LoaderCircle,
    RefreshCw,
    VolumeX,
    X
  } from 'lucide-svelte'
  import { supabase } from '$lib/auth/session-store'
  import {
    getCallSession,
    listCallSessions,
    reconcileCallSession
  } from '$lib/conference/api'
  import {
    isTerminalTranscriptStatus,
    mergeCallSessionRealtimeRow,
    transcriptReconciliationDelay,
    transcriptWatchdogKey,
    type CallSessionRealtimeRow
  } from '$lib/conference/call-session-realtime'
  import { groupTranscriptSegments } from '$lib/conference/transcript'
  import type {
    CallSession,
    CallTranscriptSegment,
    CallTranscriptStatus
  } from '$lib/conference/schema'

  let { open = $bindable(false), canvasId } = $props<{
    open?: boolean
    canvasId: string
  }>()

  let sessions = $state<CallSession[]>([])
  let selectedSessionId = $state<string | null>(null)
  let selectedSession = $state<CallSession | null>(null)
  let segments = $state<CallTranscriptSegment[]>([])
  let loading = $state(false)
  let detailLoading = $state(false)
  let error = $state<string | null>(null)
  let activeView = $state<'summary' | 'transcript'>('summary')
  let requestedCanvasId = $state<string | null>(null)
  let realtimeListRefreshPending = false
  const reconciledWatchdogs = new Set<string>()
  const terminalDetailRequests = new Set<string>()

  const liveStatuses = new Set<CallTranscriptStatus>([
    'starting',
    'active',
    'processing'
  ])

  const selectedTitle = $derived(
    selectedSession?.summary?.title ??
      (selectedSession ? formatSessionTitle(selectedSession) : 'Call summary')
  )
  const groupedSegments = $derived(groupTranscriptSegments(segments))

  function statusLabel(status: CallTranscriptStatus) {
    switch (status) {
      case 'starting':
        return 'Requested'
      case 'active':
        return 'Recording transcript'
      case 'processing':
        return 'Processing'
      case 'ready':
        return 'Ready'
      case 'no_speech':
        return 'No speech'
      case 'failed':
        return 'Failed'
      default:
        return 'Not requested'
    }
  }

  function statusClass(status: CallTranscriptStatus) {
    if (status === 'ready') {
      return 'bg-success/15 text-success'
    }
    if (status === 'failed') {
      return 'bg-destructive/15 text-destructive'
    }
    if (liveStatuses.has(status)) {
      return 'bg-primary/15 text-primary'
    }
    return 'bg-secondary text-muted-foreground'
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value))
  }

  function formatSessionTitle(session: CallSession) {
    return formatDate(session.startedAt)
  }

  async function loadSessions(keepSelection = true, showLoading = true) {
    if (!canvasId) {
      return
    }

    if (showLoading) {
      loading = true
    }
    error = null
    try {
      const response = await listCallSessions(canvasId)
      sessions = response.items

      const nextSelectedId =
        keepSelection && selectedSessionId
          ? response.items.find((item) => item.id === selectedSessionId)?.id
          : response.items[0]?.id

      selectedSessionId = nextSelectedId ?? null
      if (selectedSessionId) {
        await loadSelectedSession(selectedSessionId)
      } else {
        selectedSession = null
        segments = []
      }
    } catch (loadError) {
      error =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load call sessions.'
    } finally {
      if (showLoading) {
        loading = false
      }
    }
  }

  async function loadSelectedSession(sessionId: string) {
    detailLoading = true
    error = null
    try {
      const response = await getCallSession(canvasId, sessionId)
      selectedSession = response.item
      sessions = sessions.map((session) =>
        session.id === response.item.id ? response.item : session
      )
      segments = response.segments
    } catch (loadError) {
      error =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load the transcript.'
    } finally {
      detailLoading = false
    }
  }

  function selectSession(sessionId: string) {
    if (sessionId === selectedSessionId) {
      return
    }
    selectedSessionId = sessionId
    activeView = 'summary'
    void loadSelectedSession(sessionId)
  }

  function applyRealtimeSession(row: CallSessionRealtimeRow) {
    const index = sessions.findIndex((session) => session.id === row.id)
    if (index < 0) {
      if (
        row.transcript_status !== 'not_requested' &&
        !realtimeListRefreshPending
      ) {
        realtimeListRefreshPending = true
        void loadSessions(true, false).finally(() => {
          realtimeListRefreshPending = false
        })
      }
      return
    }

    const previous = sessions[index]
    const next = mergeCallSessionRealtimeRow(previous, row)
    sessions = sessions.map((session) =>
      session.id === next.id ? next : session
    )

    if (selectedSessionId !== next.id || !selectedSession) return
    selectedSession = mergeCallSessionRealtimeRow(selectedSession, row)

    if (
      isTerminalTranscriptStatus(next.transcriptStatus) &&
      !isTerminalTranscriptStatus(previous.transcriptStatus)
    ) {
      const detailKey = `${next.id}:${next.transcriptAttempt}`
      if (!terminalDetailRequests.has(detailKey)) {
        terminalDetailRequests.add(detailKey)
        void loadSelectedSession(next.id)
      }
    }
  }

  $effect(() => {
    if (!open) {
      requestedCanvasId = null
      return
    }
    if (!canvasId || requestedCanvasId === canvasId) {
      return
    }

    requestedCanvasId = canvasId
    sessions = []
    selectedSessionId = null
    selectedSession = null
    segments = []
    activeView = 'summary'
    void loadSessions(false)
  })

  $effect(() => {
    const client = supabase
    if (!open || !client || !canvasId) {
      return
    }

    const activeCanvasId = canvasId
    const channel = client
      .channel(`canvas:${activeCanvasId}:call-sessions`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_call_sessions',
          filter: `canvas_id=eq.${activeCanvasId}`
        },
        (payload) => applyRealtimeSession(payload.new as CallSessionRealtimeRow)
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  })

  $effect(() => {
    const session = selectedSession
    if (!open || !session) return

    const delay = transcriptReconciliationDelay(session)
    const key = transcriptWatchdogKey(session)
    if (delay === null || reconciledWatchdogs.has(key)) return

    const timer = setTimeout(() => {
      reconciledWatchdogs.add(key)
      void reconcileCallSession(canvasId, session.id)
        .then((response) => {
          sessions = sessions.map((item) =>
            item.id === response.item.id ? response.item : item
          )
          if (selectedSessionId === response.item.id) {
            selectedSession = response.item
            segments = response.segments
          }
        })
        .catch((reconcileError) => {
          error =
            reconcileError instanceof Error
              ? reconcileError.message
              : 'Could not reconcile the transcript.'
        })
    }, delay)

    return () => clearTimeout(timer)
  })
</script>

{#if open}
  <div class="fixed inset-0 z-40" data-camera-exempt>
    <button
      type="button"
      class="absolute inset-0 bg-background/20 backdrop-blur-[1px]"
      onclick={() => (open = false)}
      aria-label="Close call sessions"
      tabindex="-1"
      data-drawer-backdrop
      transition:fade={{ duration: 140 }}
    ></button>

    <div
      class="absolute right-0 top-0 z-10 flex h-full w-[min(44rem,100vw)] flex-col border-l border-border bg-card text-card-foreground shadow-2xl"
      role="dialog"
      aria-label="Call sessions"
      transition:fly={{ x: 48, duration: 180, easing: cubicOut }}
    >
      <header
        class="flex items-center justify-between border-b border-border px-5 py-4"
      >
        <div class="min-w-0">
          <h2 class="text-base font-semibold">Call sessions</h2>
          <p class="truncate text-xs text-muted-foreground">
            Call summaries and transcripts
          </p>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            onclick={() => void loadSessions(true)}
            disabled={loading}
            aria-label="Refresh call sessions"
          >
            {#if loading}
              <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
            {:else}
              <RefreshCw class="size-4" aria-hidden="true" />
            {/if}
          </button>
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onclick={() => (open = false)}
            aria-label="Close call sessions"
          >
            <X class="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {#if error}
        <div
          class="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <CircleAlert class="size-4 shrink-0" aria-hidden="true" />
          <span class="min-w-0">{error}</span>
        </div>
      {/if}

      <div class="grid min-h-0 flex-1 grid-cols-[16rem_minmax(0,1fr)]">
        <div class="min-h-0 overflow-y-auto border-r border-border p-3">
          {#if loading && sessions.length === 0}
            <div
              class="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground"
            >
              <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
              Loading sessions
            </div>
          {:else if sessions.length === 0}
            <div class="px-2 py-4 text-sm text-muted-foreground">
              No transcript sessions yet.
            </div>
          {:else}
            <div class="flex flex-col gap-1">
              {#each sessions as session (session.id)}
                <button
                  type="button"
                  class={`flex w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left transition ${
                    selectedSessionId === session.id
                      ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'hover:bg-muted'
                  }`}
                  onclick={() => selectSession(session.id)}
                >
                  <span class="flex items-center gap-2">
                    <FileText class="size-4 shrink-0" aria-hidden="true" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-semibold">
                        {session.summary?.title ?? formatSessionTitle(session)}
                      </span>
                      {#if session.summary}
                        <span
                          class="mt-0.5 block truncate text-[11px] text-muted-foreground"
                        >
                          {formatSessionTitle(session)}
                        </span>
                      {/if}
                    </span>
                  </span>
                  <span
                    class={`w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(session.transcriptStatus)}`}
                  >
                    {statusLabel(session.transcriptStatus)}
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <section class="min-h-0 overflow-y-auto p-5">
          {#if !selectedSession}
            <div
              class="flex h-full items-center justify-center text-sm text-muted-foreground"
            >
              Select a session.
            </div>
          {:else}
            <div class="mb-4 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h3 class="truncate text-base font-semibold">
                  {selectedTitle}
                </h3>
                <p class="text-xs text-muted-foreground">
                  {formatSessionTitle(selectedSession)} · {groupedSegments.length}
                  speaker turn{groupedSegments.length === 1 ? '' : 's'}
                </p>
              </div>
              <span
                class={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusClass(selectedSession.transcriptStatus)}`}
              >
                {#if selectedSession.transcriptStatus === 'ready'}
                  <CircleCheck
                    class="mr-1 inline size-3.5"
                    aria-hidden="true"
                  />
                {:else if selectedSession.transcriptStatus === 'no_speech'}
                  <VolumeX class="mr-1 inline size-3.5" aria-hidden="true" />
                {:else if liveStatuses.has(selectedSession.transcriptStatus)}
                  <LoaderCircle
                    class="mr-1 inline size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                {/if}
                {statusLabel(selectedSession.transcriptStatus)}
              </span>
            </div>

            {#if detailLoading}
              <div
                class="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
                Loading call details
              </div>
            {:else if selectedSession.transcriptStatus === 'no_speech'}
              <div
                class="flex items-start gap-3 rounded-lg border border-dashed border-border p-5 text-muted-foreground"
              >
                <VolumeX class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p class="text-sm font-medium text-foreground">
                    No speech was captured
                  </p>
                  <p class="mt-1 text-sm leading-6">
                    No transcript or summary was created for this call.
                  </p>
                </div>
              </div>
            {:else}
              <div
                class="mb-5 flex border-b border-border"
                role="tablist"
                aria-label="Call session view"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeView === 'summary'}
                  class={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                    activeView === 'summary'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onclick={() => (activeView = 'summary')}
                >
                  Summary
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeView === 'transcript'}
                  class={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                    activeView === 'transcript'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onclick={() => (activeView = 'transcript')}
                >
                  Transcript
                </button>
              </div>

              {#if activeView === 'summary'}
                {#if selectedSession.summary}
                  <div class="space-y-6">
                    <p class="whitespace-pre-wrap text-sm leading-6">
                      {selectedSession.summary.overview}
                    </p>

                    {#if selectedSession.summary.keyPoints.length > 0}
                      <section class="border-t border-border pt-5">
                        <h4 class="mb-3 text-sm font-semibold">Key points</h4>
                        <ul class="space-y-2 text-sm leading-6">
                          {#each selectedSession.summary.keyPoints as point}
                            <li class="flex gap-2">
                              <span
                                class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                                aria-hidden="true"
                              ></span>
                              <span>{point}</span>
                            </li>
                          {/each}
                        </ul>
                      </section>
                    {/if}

                    {#if selectedSession.summary.decisions.length > 0}
                      <section class="border-t border-border pt-5">
                        <h4 class="mb-3 text-sm font-semibold">Decisions</h4>
                        <ul class="space-y-2 text-sm leading-6">
                          {#each selectedSession.summary.decisions as decision}
                            <li class="flex gap-2">
                              <CircleCheck
                                class="mt-1 size-4 shrink-0 text-success"
                                aria-hidden="true"
                              />
                              <span>{decision}</span>
                            </li>
                          {/each}
                        </ul>
                      </section>
                    {/if}

                    {#if selectedSession.summary.actionItems.length > 0}
                      <section class="border-t border-border pt-5">
                        <h4 class="mb-3 text-sm font-semibold">Action items</h4>
                        <ul class="space-y-3 text-sm leading-6">
                          {#each selectedSession.summary.actionItems as action}
                            <li class="flex gap-2">
                              <ListChecks
                                class="mt-1 size-4 shrink-0 text-primary"
                                aria-hidden="true"
                              />
                              <span>
                                {action.text}
                                {#if action.owner}
                                  <span class="text-muted-foreground">
                                    · {action.owner}
                                  </span>
                                {/if}
                              </span>
                            </li>
                          {/each}
                        </ul>
                      </section>
                    {/if}
                  </div>
                {:else if liveStatuses.has(selectedSession.transcriptStatus)}
                  <div
                    class="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <LoaderCircle
                      class="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Preparing call summary
                  </div>
                {:else}
                  <div
                    class="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground"
                  >
                    A summary is not available for this session. The grouped
                    transcript is still available.
                  </div>
                {/if}
              {:else if groupedSegments.length === 0}
                <div
                  class={`rounded-lg border border-dashed p-5 text-sm ${
                    selectedSession.transcriptStatus === 'failed'
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {selectedSession.errorMessage ??
                    'No transcript lines captured.'}
                </div>
              {:else}
                <div class="flex flex-col gap-5">
                  {#each groupedSegments as utterance (utterance.id)}
                    <article
                      class="border-b border-border/70 pb-5 last:border-0"
                    >
                      <div
                        class="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span class="font-semibold text-foreground">
                          {utterance.speakerName ?? utterance.speakerIdentity}
                        </span>
                        {#if utterance.startTimeSeconds !== null}
                          <span>{Math.floor(utterance.startTimeSeconds)}s</span>
                        {/if}
                      </div>
                      <p class="whitespace-pre-wrap text-sm leading-6">
                        {utterance.text}
                      </p>
                    </article>
                  {/each}
                </div>
              {/if}
            {/if}
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}
