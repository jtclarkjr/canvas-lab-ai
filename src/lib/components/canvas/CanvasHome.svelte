<script lang="ts">
  import { onMount, tick } from 'svelte'
  import {
    EllipsisVertical,
    FileText,
    LoaderCircle,
    Plus,
    Search
  } from 'lucide-svelte'
  import { goto, invalidate } from '$app/navigation'
  import { fade, scale } from 'svelte/transition'
  import { flip } from 'svelte/animate'
  import { createCanvas, deleteCanvas, listCanvases } from '$lib/canvas/api'
  import { CANVASES_DEPENDENCY } from '$lib/canvas/consts'
  import { isAnonymousUser } from '$lib/auth/anonymous'
  import CanvasSearchDialog from '$lib/components/canvas/CanvasSearchDialog.svelte'
  import Modal from '$lib/components/shared/Modal.svelte'
  import RoleBadge from '$lib/components/shared/RoleBadge.svelte'
  import type { Canvas } from '$lib/canvas/schema'
  import { session } from '$lib/stores/shared/session.svelte'
  import { updateCanvas } from '$lib/workspace/api'

  let {
    initialCanvases = [],
    initialError = null,
    user = null
  } = $props<{
    initialCanvases?: Canvas[]
    initialError?: string | null
    user?: { id: string; isAnonymous?: boolean } | null
  }>()

  function getInitialCanvases() {
    return initialCanvases
  }

  let canvases = $state<Canvas[]>(getInitialCanvases())

  const ownedCanvases = $derived(
    canvases.filter((canvas) => !canvas.role || canvas.role === 'owner')
  )
  const sharedCanvases = $derived(
    canvases.filter((canvas) => canvas.role && canvas.role !== 'owner')
  )
  const sessionUser = $derived(session.data?.user ?? null)
  const activeUser = $derived.by(() => {
    if (user && !isAnonymousUser(user)) return user
    if (sessionUser && !isAnonymousUser(sessionUser)) return sessionUser
    return null
  })
  let isLoading = $state(false)
  let isCreating = $state(false)
  let isSearchOpen = $state(false)
  let isDeleteDialogOpen = $state(false)
  let deleteTarget = $state<Canvas | null>(null)
  let isDeletingId = $state<string | null>(null)
  let openMenuCanvasId = $state<string | null>(null)
  let editingCanvasId = $state<string | null>(null)
  let editingTitle = $state('')
  let titleInputEl = $state<HTMLInputElement | null>(null)
  let savingTitleId = $state<string | null>(null)
  let openingCanvasId = $state<string | null>(null)
  let openingCanvasTitle = $state<string | null>(null)
  let localError = $state<string | null>(null)
  let hasLoadedFallback = $state(false)
  const error = $derived(localError ?? initialError)

  function formatCanvasDate(dateString: string | null | undefined): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  async function loadCanvases() {
    if (!activeUser) {
      canvases = []
      isLoading = false
      isSearchOpen = false
      return
    }

    isLoading = true
    localError = null

    try {
      const response = await listCanvases()
      canvases = response.items
    } catch (nextError) {
      localError =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to load canvases.'
    } finally {
      isLoading = false
    }
  }

  async function openCanvas(canvas: Pick<Canvas, 'id' | 'title'>) {
    openMenuCanvasId = null
    openingCanvasId = canvas.id
    openingCanvasTitle = canvas.title
    localError = null

    await tick()
    if (typeof requestAnimationFrame !== 'undefined') {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      )
    }

    try {
      await goto(`/canvas/${canvas.id}`)
    } catch (error) {
      openingCanvasId = null
      openingCanvasTitle = null
      throw error
    }
  }

  function shouldHandleCanvasNavigation(event: MouseEvent) {
    const target = event.currentTarget
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      target instanceof HTMLAnchorElement &&
      (!target.target || target.target === '_self')
    )
  }

  async function handleCanvasNavigation(event: MouseEvent, canvas: Canvas) {
    if (!shouldHandleCanvasNavigation(event)) {
      return
    }

    event.preventDefault()
    if (openingCanvasId) {
      return
    }

    try {
      await openCanvas(canvas)
    } catch (nextError) {
      localError =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to open canvas.'
    }
  }

  async function handleSearchSelect(canvas: Canvas) {
    if (openingCanvasId) {
      return
    }

    try {
      await openCanvas(canvas)
    } catch (nextError) {
      localError =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to open canvas.'
    }
  }

  async function handleCreate() {
    if (!activeUser) {
      window.location.assign('/login?redirect=%2F')
      return
    }

    isCreating = true
    localError = null

    try {
      const response = await createCanvas({ title: 'Untitled' })
      canvases = [response.item, ...canvases]
      await invalidate(CANVASES_DEPENDENCY)
      await openCanvas(response.item)
    } catch (nextError) {
      localError =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to create canvas.'
    } finally {
      isCreating = false
    }
  }

  async function startRenameCanvas(canvas: Canvas) {
    if (openingCanvasId || savingTitleId) {
      return
    }

    openMenuCanvasId = null
    editingCanvasId = canvas.id
    editingTitle = canvas.title
    localError = null

    await tick()
    titleInputEl?.focus()
    titleInputEl?.select()
  }

  function cancelRenameCanvas() {
    editingCanvasId = null
    editingTitle = ''
  }

  function toggleCanvasMenu(event: MouseEvent, canvas: Canvas) {
    event.preventDefault()
    event.stopPropagation()

    if (openingCanvasId || savingTitleId) {
      return
    }

    openMenuCanvasId = openMenuCanvasId === canvas.id ? null : canvas.id
  }

  async function commitRenameCanvas(canvas: Canvas) {
    if (editingCanvasId !== canvas.id || savingTitleId) {
      return
    }

    const nextTitle = editingTitle.trim()

    if (!nextTitle) {
      localError = 'Give the canvas a title.'
      await tick()
      titleInputEl?.focus()
      return
    }

    if (nextTitle === canvas.title) {
      cancelRenameCanvas()
      return
    }

    savingTitleId = canvas.id
    localError = null

    try {
      const response = await updateCanvas(canvas.id, { title: nextTitle })
      canvases = canvases.map((entry) =>
        entry.id === canvas.id ? response.item : entry
      )
      cancelRenameCanvas()
      void invalidate(CANVASES_DEPENDENCY)
    } catch (nextError) {
      localError =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to update title.'
      await tick()
      titleInputEl?.focus()
    } finally {
      savingTitleId = null
    }
  }

  function handleRenameKeydown(event: KeyboardEvent, canvas: Canvas) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      void commitRenameCanvas(canvas)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelRenameCanvas()
    }
  }

  function handleDeleteRequest(canvas: Canvas) {
    openMenuCanvasId = null
    cancelRenameCanvas()
    deleteTarget = canvas
    localError = null
    isDeleteDialogOpen = true
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return
    }

    const canvas = deleteTarget
    isDeletingId = canvas.id
    localError = null

    try {
      await deleteCanvas(canvas.id)
      canvases = canvases.filter((entry) => entry.id !== canvas.id)
      deleteTarget = null
      isDeleteDialogOpen = false
      void invalidate(CANVASES_DEPENDENCY)
    } catch (nextError) {
      localError =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to delete canvas.'
    } finally {
      isDeletingId = null
    }
  }

  $effect(() => {
    if (!isDeleteDialogOpen && !isDeletingId) {
      deleteTarget = null
    }
  })

  $effect(() => {
    canvases = initialCanvases
  })

  $effect(() => {
    if (!activeUser) {
      canvases = []
      isLoading = false
      return
    }

    if (!user && session.data?.user?.id && !hasLoadedFallback) {
      hasLoadedFallback = true
      void loadCanvases()
    }
  })

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openMenuCanvasId) {
        openMenuCanvasId = null
        return
      }

      if (
        event.key.toLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey) ||
        !activeUser ||
        editingCanvasId ||
        isDeleteDialogOpen
      ) {
        return
      }

      event.preventDefault()
      isSearchOpen = true
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!openMenuCanvasId) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest('[data-canvas-tile-menu]')
      ) {
        return
      }

      openMenuCanvasId = null
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleDocumentMouseDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleDocumentMouseDown)
    }
  })
</script>

<section
  class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
  >
    <div class="grid gap-3">
      <p class="m-0 text-sm font-bold uppercase tracking-[0.2em] text-primary">
        Canvas
      </p>
      <h1
        class="m-0 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
      >
        Recent canvases
      </h1>
      <p class="m-0 max-w-3xl text-lg leading-8 text-muted-foreground">
        Create a new canvas or reopen a previous one to keep drawing.
      </p>
    </div>

    {#if activeUser}
      <button
        type="button"
        class="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/50 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:mt-1"
        onclick={() => {
          isSearchOpen = true
        }}
        aria-label="Search canvases"
      >
        <Search class="size-4 text-muted-foreground" aria-hidden="true" />
        <span>Search</span>
      </button>
    {/if}
  </div>

  {#if error}
    <div
      class="surface-card border-destructive/30 p-4 text-sm text-destructive"
    >
      {error}
    </div>
  {/if}

  <div
    class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    <button
      type="button"
      class="group relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-dashed border-border bg-card shadow-sm transition hover:border-primary hover:bg-accent/40 hover:shadow-md disabled:opacity-50"
      onclick={() => void handleCreate()}
      disabled={isCreating}
    >
      <div class="flex h-full flex-col items-center justify-center gap-3 p-4">
        <div
          class="flex size-12 items-center justify-center rounded-full bg-muted transition group-hover:bg-primary/10"
        >
          <Plus
            class="size-6 text-muted-foreground transition group-hover:text-primary"
          />
        </div>
        <p
          class="m-0 text-sm font-medium text-muted-foreground transition group-hover:text-primary"
        >
          Create new canvas
        </p>
      </div>
    </button>

    {#if isLoading}
      {#each Array.from({ length: 4 }) as _, index (index)}
        <div
          class="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        >
          <div
            class="flex h-3/4 items-center justify-center border-b border-border bg-gradient-to-br from-muted to-card p-4"
          >
            <div class="size-20 animate-pulse rounded-lg bg-secondary"></div>
          </div>
          <div class="flex h-1/4 flex-col justify-center gap-2 px-4">
            <div class="h-4 w-3/4 animate-pulse rounded bg-secondary"></div>
            <div class="h-3 w-1/3 animate-pulse rounded bg-secondary"></div>
          </div>
        </div>
      {/each}
    {:else}
      {#each ownedCanvases as canvas (canvas.id)}
        {@const isEditingTitle = editingCanvasId === canvas.id}
        <div
          out:scale={{ duration: 200, start: 0.92, opacity: 0 }}
          animate:flip={{ duration: 250 }}
          aria-busy={openingCanvasId === canvas.id ||
            savingTitleId === canvas.id}
          class={`group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md ${openingCanvasId === canvas.id ? 'border-primary/60 shadow-lg ring-2 ring-primary/25' : ''} ${openingCanvasId && openingCanvasId !== canvas.id ? 'opacity-60' : ''}`}
        >
          {#if !isEditingTitle}
            <div
              class={`absolute right-2 top-2 z-10 hidden transition md:block ${openMenuCanvasId === canvas.id ? 'opacity-100' : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100'}`}
              data-canvas-tile-menu
            >
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-lg bg-card/95 text-muted-foreground shadow-md transition hover:bg-primary/10 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                onclick={(event) => toggleCanvasMenu(event, canvas)}
                disabled={openingCanvasId !== null || savingTitleId !== null}
                aria-label={`Canvas actions for "${canvas.title}"`}
                aria-haspopup="menu"
                aria-expanded={openMenuCanvasId === canvas.id}
                title="Canvas actions"
              >
                <EllipsisVertical class="size-4" aria-hidden="true" />
              </button>

              {#if openMenuCanvasId === canvas.id}
                <div
                  class="absolute right-0 top-full mt-1 min-w-32 rounded-lg border border-border/70 bg-popover p-1 text-sm text-popover-foreground shadow-xl"
                  role="menu"
                >
                  <button
                    type="button"
                    class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-muted"
                    role="menuitem"
                    onclick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      void startRenameCanvas(canvas)
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
                    role="menuitem"
                    onclick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleDeleteRequest(canvas)
                    }}
                  >
                    Delete
                  </button>
                </div>
              {/if}
            </div>
          {/if}

          {#if isEditingTitle}
            <div class="flex h-full flex-col">
              <div
                class="flex h-3/4 items-center justify-center border-b border-border bg-gradient-to-br from-muted to-card p-4"
              >
                <div class="rounded-lg bg-background/80 p-4 shadow-inner">
                  <FileText class="size-12 text-muted-foreground/50" />
                </div>
              </div>

              <div class="flex h-1/4 flex-col justify-center gap-1 px-3">
                <div class="flex items-center gap-2">
                  <input
                    bind:this={titleInputEl}
                    bind:value={editingTitle}
                    class="min-w-0 flex-1 rounded-md border border-primary/40 bg-background/95 px-2 py-1 text-sm font-medium text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    maxlength="100"
                    readonly={savingTitleId === canvas.id}
                    aria-label={`Rename "${canvas.title}"`}
                    onblur={() => void commitRenameCanvas(canvas)}
                    onkeydown={(event) => handleRenameKeydown(event, canvas)}
                  />
                  {#if savingTitleId === canvas.id}
                    <LoaderCircle
                      class="size-4 shrink-0 animate-spin text-primary"
                      aria-hidden="true"
                    />
                  {/if}
                </div>
                <p class="m-0 text-xs text-muted-foreground">
                  {formatCanvasDate(canvas.createdAt)}
                </p>
              </div>
            </div>
          {:else}
            <a
              href={`/canvas/${canvas.id}`}
              onclick={(event) => void handleCanvasNavigation(event, canvas)}
              class="flex h-full flex-col"
            >
              <div
                class="flex h-3/4 items-center justify-center border-b border-border bg-gradient-to-br from-muted to-card p-4"
              >
                <div class="rounded-lg bg-background/80 p-4 shadow-inner">
                  <FileText class="size-12 text-muted-foreground/50" />
                </div>
              </div>

              <div class="flex h-1/4 flex-col justify-center gap-1 px-4">
                <h2
                  class="m-0 truncate text-sm font-medium text-card-foreground group-hover:text-primary"
                >
                  {canvas.title}
                </h2>
                <p class="m-0 text-xs text-muted-foreground">
                  {formatCanvasDate(canvas.createdAt)}
                </p>
              </div>
            </a>
          {/if}

          {#if openingCanvasId === canvas.id}
            <div
              in:fade={{ duration: 120 }}
              class="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[2px]"
            >
              <div
                in:scale={{ duration: 140, start: 0.95 }}
                class="inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-xs font-semibold text-foreground shadow-lg"
              >
                <LoaderCircle class="size-4 animate-spin text-primary" />
                Opening
              </div>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  {#if !isLoading && sharedCanvases.length > 0}
    <div class="grid gap-4">
      <h2 class="m-0 text-2xl font-semibold tracking-tight text-foreground">
        Shared with me
      </h2>
      <div
        class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {#each sharedCanvases as canvas (canvas.id)}
          <a
            href={`/canvas/${canvas.id}`}
            onclick={(event) => void handleCanvasNavigation(event, canvas)}
            out:scale={{ duration: 200, start: 0.92, opacity: 0 }}
            animate:flip={{ duration: 250 }}
            aria-busy={openingCanvasId === canvas.id}
            class={`group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md ${openingCanvasId === canvas.id ? 'border-primary/60 shadow-lg ring-2 ring-primary/25' : ''} ${openingCanvasId && openingCanvasId !== canvas.id ? 'opacity-60' : ''}`}
          >
            <div class="absolute right-2 top-2 z-10">
              <RoleBadge role={canvas.role ?? 'reader'} />
            </div>

            <div
              class="flex h-3/4 items-center justify-center border-b border-border bg-gradient-to-br from-muted to-card p-4"
            >
              <div class="rounded-lg bg-background/80 p-4 shadow-inner">
                <FileText class="size-12 text-muted-foreground/50" />
              </div>
            </div>

            <div class="flex h-1/4 flex-col justify-center gap-1 px-4">
              <h2
                class="m-0 truncate text-sm font-medium text-card-foreground group-hover:text-primary"
              >
                {canvas.title}
              </h2>
              <p class="m-0 text-xs text-muted-foreground">
                {formatCanvasDate(canvas.createdAt)}
              </p>
            </div>

            {#if openingCanvasId === canvas.id}
              <div
                in:fade={{ duration: 120 }}
                class="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-[2px]"
              >
                <div
                  in:scale={{ duration: 140, start: 0.95 }}
                  class="inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-xs font-semibold text-foreground shadow-lg"
                >
                  <LoaderCircle class="size-4 animate-spin text-primary" />
                  Opening
                </div>
              </div>
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {/if}

  {#if !isLoading && activeUser && canvases.length === 0}
    <div class="py-12 text-center text-muted-foreground">
      No canvases yet. Create your first one to get started.
    </div>
  {/if}
</section>

{#if openingCanvasId}
  <div
    in:fade={{ duration: 120 }}
    class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
  >
    <div
      in:scale={{ duration: 140, start: 0.96 }}
      class="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-xl backdrop-blur"
      role="status"
    >
      <LoaderCircle
        class="size-4 animate-spin text-primary"
        aria-hidden="true"
      />
      Opening {openingCanvasTitle ?? 'canvas'}
    </div>
  </div>
{/if}

{#if activeUser}
  <CanvasSearchDialog
    bind:open={isSearchOpen}
    {canvases}
    {isLoading}
    {openingCanvasId}
    onSelect={(canvas) => void handleSearchSelect(canvas)}
  />
{/if}

<Modal
  bind:open={isDeleteDialogOpen}
  title="Delete canvas"
  eyebrow="Confirm action"
  widthClass="max-w-md"
>
  <div class="grid gap-6">
    <p class="m-0 text-sm leading-6 text-muted-foreground">
      Delete
      <span class="font-semibold text-foreground"
        >{deleteTarget?.title ?? 'this canvas'}</span
      >? This action cannot be undone.
    </p>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-secondary"
        onclick={() => {
          isDeleteDialogOpen = false
        }}
        disabled={isDeletingId !== null}
      >
        Cancel
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={() => void handleDeleteConfirm()}
        disabled={!deleteTarget || isDeletingId !== null}
      >
        {#if isDeletingId === deleteTarget?.id}
          Deleting...
        {:else}
          Delete canvas
        {/if}
      </button>
    </div>
  </div>
</Modal>
