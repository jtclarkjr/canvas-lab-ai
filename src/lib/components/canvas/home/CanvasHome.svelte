<script lang="ts">
  import { onMount, tick } from 'svelte'
  import {
    ArrowDown,
    ArrowUp,
    CalendarDays,
    Clock3,
    LoaderCircle,
    Plus,
    Search,
    Type as TypeIcon
  } from 'lucide-svelte'
  import { goto, invalidate } from '$app/navigation'
  import { page } from '$app/state'
  import { fade, scale } from 'svelte/transition'
  import { createCanvas, deleteCanvas, listCanvases } from '$lib/canvas/api'
  import { CANVASES_DEPENDENCY } from '$lib/canvas/consts'
  import {
    CANVAS_SORT_OPTIONS,
    getNextCanvasSortState,
    parseCanvasSort,
    sortCanvases,
    type CanvasSortKey,
    type CanvasSortState
  } from '$lib/canvas/sort'
  import { isAnonymousUser } from '$lib/auth/anonymous'
  import CanvasDeleteDialog from '$lib/components/canvas/home/CanvasDeleteDialog.svelte'
  import CanvasHomeOwnedTile from '$lib/components/canvas/home/CanvasHomeOwnedTile.svelte'
  import CanvasHomeSharedTile from '$lib/components/canvas/home/CanvasHomeSharedTile.svelte'
  import CanvasIconUploadDialog from '$lib/components/canvas/home/CanvasIconUploadDialog.svelte'
  import CanvasSearchDialog from '$lib/components/canvas/CanvasSearchDialog.svelte'
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

  const currentSort = $derived(parseCanvasSort(page.url.searchParams))
  const tileDateLabel = $derived(
    currentSort.key === 'created' ? 'Created' : 'Updated'
  )
  const ownedCanvases = $derived(
    sortCanvases(
      canvases.filter((canvas) => !canvas.role || canvas.role === 'owner'),
      currentSort
    )
  )
  const sharedCanvases = $derived(
    sortCanvases(
      canvases.filter((canvas) => canvas.role && canvas.role !== 'owner'),
      currentSort
    )
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
  let isIconDialogOpen = $state(false)
  let iconTarget = $state<Canvas | null>(null)
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

  function openIconUploadDialog(canvas: Canvas) {
    openMenuCanvasId = null
    cancelRenameCanvas()
    iconTarget = canvas
    isIconDialogOpen = true
  }

  function handleIconChanged(canvas: Canvas) {
    canvases = canvases.map((entry) =>
      entry.id === canvas.id ? canvas : entry
    )
    iconTarget = null
    void invalidate(CANVASES_DEPENDENCY)
  }

  function getTileDateValue(canvas: Canvas): string {
    return currentSort.key === 'created' ? canvas.createdAt : canvas.updatedAt
  }

  function getCanvasSortUrl(sort: CanvasSortState): string {
    const url = new URL(page.url)
    url.searchParams.set('sort', sort.key)
    url.searchParams.set('dir', sort.dir)
    return `${url.pathname}${url.search}${url.hash}`
  }

  async function setCanvasSort(key: CanvasSortKey) {
    await goto(getCanvasSortUrl(getNextCanvasSortState(currentSort, key)), {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    })
  }

  async function loadCanvases({
    showLoading = true
  }: { showLoading?: boolean } = {}) {
    if (!activeUser) {
      canvases = []
      isLoading = false
      isSearchOpen = false
      return
    }

    if (showLoading) {
      isLoading = true
    }
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
      if (showLoading) {
        isLoading = false
      }
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
      window.location.assign('/login?redirect=%2Fhome')
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
    if (!isIconDialogOpen) {
      iconTarget = null
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
    if (activeUser) {
      void loadCanvases({ showLoading: canvases.length === 0 })
    }

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
        isIconDialogOpen ||
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

  {#if error}
    <div
      class="surface-card border-destructive/30 p-4 text-sm text-destructive"
    >
      {error}
    </div>
  {/if}

  {#if activeUser}
    <div class="flex w-full flex-wrap items-center justify-end gap-1.5">
      <div
        class="inline-flex max-w-full flex-wrap items-center gap-0.5"
        role="group"
        aria-label="Sort canvases"
      >
        {#each CANVAS_SORT_OPTIONS as option}
          <button
            type="button"
            class={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring ${currentSort.key === option.key ? 'border border-border/70 bg-muted/70 text-foreground' : 'border border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
            aria-pressed={currentSort.key === option.key}
            title={`Sort by ${option.label}`}
            onclick={() => void setCanvasSort(option.key)}
          >
            {#if option.key === 'updated'}
              <Clock3 class="size-3.5" aria-hidden="true" />
            {:else if option.key === 'created'}
              <CalendarDays class="size-3.5" aria-hidden="true" />
            {:else}
              <TypeIcon class="size-3.5" aria-hidden="true" />
            {/if}
            <span>{option.label}</span>
            {#if currentSort.key === option.key}
              {#if currentSort.dir === 'asc'}
                <ArrowUp
                  class="size-3 text-muted-foreground"
                  aria-hidden="true"
                />
              {:else}
                <ArrowDown
                  class="size-3 text-muted-foreground"
                  aria-hidden="true"
                />
              {/if}
            {/if}
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:bg-muted/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onclick={() => {
          isSearchOpen = true
        }}
        aria-label="Search canvases"
        title="Search canvases"
      >
        <Search class="size-3.5" aria-hidden="true" />
      </button>
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
        <CanvasHomeOwnedTile
          {canvas}
          isEditingTitle={editingCanvasId === canvas.id}
          bind:editingTitle
          bind:titleInputEl
          savingTitle={savingTitleId === canvas.id}
          isOpening={openingCanvasId === canvas.id}
          isDimmed={Boolean(openingCanvasId && openingCanvasId !== canvas.id)}
          menuOpen={openMenuCanvasId === canvas.id}
          dateLabel={tileDateLabel}
          dateValue={getTileDateValue(canvas)}
          onNavigate={handleCanvasNavigation}
          onToggleMenu={toggleCanvasMenu}
          onUploadIcon={openIconUploadDialog}
          onStartRename={startRenameCanvas}
          onDelete={handleDeleteRequest}
          onCommitRename={commitRenameCanvas}
          onRenameKeydown={handleRenameKeydown}
        />
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
          <CanvasHomeSharedTile
            {canvas}
            isOpening={openingCanvasId === canvas.id}
            isDimmed={Boolean(openingCanvasId && openingCanvasId !== canvas.id)}
            dateLabel={tileDateLabel}
            dateValue={getTileDateValue(canvas)}
            onNavigate={handleCanvasNavigation}
          />
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

<CanvasIconUploadDialog
  bind:open={isIconDialogOpen}
  canvas={iconTarget}
  onChanged={handleIconChanged}
/>

<CanvasDeleteDialog
  bind:open={isDeleteDialogOpen}
  canvas={deleteTarget}
  deleting={isDeletingId !== null}
  onConfirm={handleDeleteConfirm}
/>
