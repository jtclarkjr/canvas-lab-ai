<script lang="ts">
  import { BookMarked, Download, MessageSquare, Save } from 'lucide-svelte'
  import { markdownDocumentContentSchema, type SceneDocument } from '$lib/scenes/schema'
  import { downloadMarkdown } from '$lib/scenes/download'

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
    onSave: (title: string, markdown: string) => void
    onPromote: () => void
    onBack: () => void
  }>()

  function parseMarkdown(document: SceneDocument): string {
    const parsed = markdownDocumentContentSchema.safeParse(document.content)
    return parsed.success ? parsed.data.markdown : ''
  }

  // svelte-ignore state_referenced_locally -- seeds the editor once per document
  let title = $state(sceneDocument.title)
  // svelte-ignore state_referenced_locally -- seeds the editor once per document
  let markdown = $state(parseMarkdown(sceneDocument))

  const isDirty = $derived(
    title !== sceneDocument.title || markdown !== parseMarkdown(sceneDocument)
  )
</script>

<div class="flex h-full flex-col">
  <div
    class="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-5 py-2.5"
  >
    <input
      type="text"
      bind:value={title}
      placeholder="Document title"
      class="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
      disabled={!canModify}
    />

    <div class="flex items-center gap-1.5">
      <!-- Only useful below md, where chat and editor are toggled. -->
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground md:hidden"
        onclick={onBack}
        title="Back to AI chat"
      >
        <MessageSquare class="size-3.5" />
        Back to AI
      </button>
      <button
        type="button"
        class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
        onclick={() => downloadMarkdown(title || 'document', markdown)}
        title="Download as .md"
      >
        <Download class="size-3.5" />
        .md
      </button>
      {#if canModify}
        {#if sceneDocument.status === 'draft'}
          <button
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
            onclick={onPromote}
            title="Save to the scene's library"
          >
            <BookMarked class="size-3.5" />
            Save to library
          </button>
        {/if}
        <button
          type="button"
          class="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-white transition disabled:opacity-40"
          onclick={() => onSave(title, markdown)}
          disabled={!isDirty || isSaving}
          title="Save changes"
        >
          <Save class="size-3.5" />
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      {/if}
    </div>
  </div>

  <textarea
    bind:value={markdown}
    class="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-foreground outline-none"
    placeholder="Document content (markdown)"
    spellcheck="false"
    disabled={!canModify}
  ></textarea>
</div>
