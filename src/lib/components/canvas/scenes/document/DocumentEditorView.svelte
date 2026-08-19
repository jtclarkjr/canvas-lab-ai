<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { BookMarked, Download, MessageSquare, Save } from 'lucide-svelte'
  import { Button, Input, Textarea } from '$lib/components/ui'

  import {
    markdownDocumentContentSchema,
    type SceneDocument
  } from '$lib/scenes/schema'
  import {
    sameDocumentSaveSnapshot,
    shouldAttemptAutosave
  } from '$lib/scenes/document-autosave'
  import type { DocumentSaveSnapshot } from '$lib/scenes/types'
  import { downloadMarkdown } from '$lib/scenes/download'

  const AUTO_SAVE_DEBOUNCE_MS = 1200

  let {
    document: sceneDocument,
    canModify,
    isSaving = false,
    onSave,
    onPromote,
    onBack
  } = $props<{
    document: SceneDocument
    canModify: boolean
    isSaving?: boolean
    onSave: (title: string, markdown: string) => Promise<void> | void
    onPromote: () => void
    onBack: () => void
  }>()

  function parseMarkdown(document: SceneDocument): string {
    const parsed = markdownDocumentContentSchema.safeParse(document.content)
    return parsed.success ? parsed.data.markdown : ''
  }

  // svelte-ignore state_referenced_locally -- seeds the editor once on mount
  let seededTitle = $state(sceneDocument.title)
  // svelte-ignore state_referenced_locally -- seeds the editor once on mount
  let seededMarkdown = $state(parseMarkdown(sceneDocument))
  // svelte-ignore state_referenced_locally -- seeds the editor once on mount
  let title = $state(sceneDocument.title)
  // svelte-ignore state_referenced_locally -- seeds the editor once on mount
  let markdown = $state(parseMarkdown(sceneDocument))
  let pendingSave = $state<DocumentSaveSnapshot | null>(null)
  let lastSaveAttempt = $state<DocumentSaveSnapshot | null>(null)

  const isDirty = $derived(title !== seededTitle || markdown !== seededMarkdown)

  function snapshot(title: string, markdown: string): DocumentSaveSnapshot {
    return { title, markdown }
  }

  function currentSnapshot() {
    return snapshot(title, markdown)
  }

  function baselineSnapshot() {
    return snapshot(seededTitle, seededMarkdown)
  }

  function clearMatchingSaveAttempt(saved: DocumentSaveSnapshot) {
    if (sameDocumentSaveSnapshot(pendingSave, saved)) {
      pendingSave = null
    }
    if (sameDocumentSaveSnapshot(lastSaveAttempt, saved)) {
      lastSaveAttempt = null
    }
  }

  async function saveSnapshot(
    next: DocumentSaveSnapshot,
    options: { manual?: boolean } = {}
  ) {
    if (!canModify) {
      return
    }
    if (sameDocumentSaveSnapshot(next, baselineSnapshot())) {
      return
    }
    if (
      !options.manual &&
      !shouldAttemptAutosave({
        current: next,
        baseline: baselineSnapshot(),
        pending: pendingSave,
        lastAttempt: lastSaveAttempt
      })
    ) {
      return
    }

    pendingSave = next
    lastSaveAttempt = next
    try {
      await onSave(next.title, next.markdown)
    } finally {
      if (sameDocumentSaveSnapshot(pendingSave, next)) {
        pendingSave = null
      }
    }
  }

  // Sync remote document changes (AI writes, collaborators, save echoes)
  // into the editor IN PLACE — no remount, so the caret is preserved.
  $effect(() => {
    const documentTitle = sceneDocument.title
    const documentMarkdown = parseMarkdown(sceneDocument)

    untrack(() => {
      if (
        documentTitle === seededTitle &&
        documentMarkdown === seededMarkdown
      ) {
        return
      }
      // Our own save round-tripped: adopt it as the new baseline.
      if (documentTitle === title && documentMarkdown === markdown) {
        seededTitle = documentTitle
        seededMarkdown = documentMarkdown
        clearMatchingSaveAttempt(snapshot(documentTitle, documentMarkdown))
        return
      }
      // Remote change while the user has local edits: keep theirs — the
      // pending auto-save resolves the conflict (last write wins).
      if (title !== seededTitle || markdown !== seededMarkdown) {
        return
      }
      seededTitle = documentTitle
      seededMarkdown = documentMarkdown
      title = documentTitle
      markdown = documentMarkdown
      clearMatchingSaveAttempt(snapshot(documentTitle, documentMarkdown))
    })
  })

  // Auto-save manual edits so the AI always works from the latest content
  // (the chat route injects the persisted document into the prompt).
  $effect(() => {
    const nextTitle = title
    const nextMarkdown = markdown
    const nextSnapshot = snapshot(nextTitle, nextMarkdown)
    if (!canModify) {
      return
    }
    if (
      !shouldAttemptAutosave({
        current: nextSnapshot,
        baseline: baselineSnapshot(),
        pending: pendingSave,
        lastAttempt: lastSaveAttempt
      })
    ) {
      return
    }

    const timer = setTimeout(() => {
      void saveSnapshot(nextSnapshot)
    }, AUTO_SAVE_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  })

  // Flush pending edits when the editor unmounts (view switch, close).
  onMount(() => () => {
    if (canModify && (title !== seededTitle || markdown !== seededMarkdown)) {
      void saveSnapshot(currentSnapshot(), { manual: true })
    }
  })

  const saveStateLabel = $derived.by(() => {
    if (isSaving) return 'Saving…'
    if (isDirty) return 'Unsaved edits'
    return 'Saved'
  })
</script>

<div class="flex h-full flex-col">
  <div
    class="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-5 py-2.5"
  >
    <Input
      type="text"
      bind:value={title}
      placeholder="Document title"
      aria-label="Document title"
      class="h-auto min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-foreground shadow-none outline-none placeholder:text-muted-foreground focus:border-0 focus:ring-0"
      disabled={!canModify}
    />

    <div class="flex items-center gap-1.5">
      {#if canModify}
        <span class="text-xs text-muted-foreground">{saveStateLabel}</span>
      {/if}
      <!-- Only useful below md, where chat and editor are toggled. -->
      <Button
        variant="outline"
        size="sm"
        class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground md:hidden"
        onclick={onBack}
        aria-label="Back to AI chat"
      >
        <MessageSquare class="size-3.5" aria-hidden="true" />
        Back to AI
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
        onclick={() => downloadMarkdown(title || 'document', markdown)}
        aria-label="Download as Markdown file"
      >
        <Download class="size-3.5" aria-hidden="true" />
        .md
      </Button>
      {#if canModify}
        {#if sceneDocument.status === 'draft'}
          <Button
            variant="outline"
            size="sm"
            class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
            onclick={onPromote}
            aria-label="Save to the scene's library"
          >
            <BookMarked class="size-3.5" aria-hidden="true" />
            Save to library
          </Button>
        {/if}
        <Button
          size="sm"
          class="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition disabled:opacity-40"
          onclick={() => void saveSnapshot(currentSnapshot(), { manual: true })}
          disabled={!isDirty || isSaving}
          aria-label="Save now"
        >
          <Save class="size-3.5" aria-hidden="true" />
          Save
        </Button>
      {/if}
    </div>
  </div>

  <Textarea
    bind:value={markdown}
    class="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-foreground shadow-none outline-none focus:border-0 focus:ring-0"
    placeholder="Document content (markdown)"
    aria-label="Document content in Markdown"
    spellcheck="false"
    disabled={!canModify}
  />
</div>
