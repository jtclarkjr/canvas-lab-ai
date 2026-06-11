<script lang="ts">
  import { FileText, Plus, Trash2 } from 'lucide-svelte'
  import { scale } from 'svelte/transition'
  import { flip } from 'svelte/animate'
  import { createCanvas, deleteCanvas, listCanvases } from '$lib/canvas/api'
  import Modal from '$lib/components/shared/Modal.svelte'
  import RoleBadge from '$lib/components/shared/RoleBadge.svelte'
  import type { Canvas } from '$lib/canvas/schema'
  import { session } from '$lib/stores/session.svelte'

  let canvases = $state<Canvas[]>([])

  const ownedCanvases = $derived(
    canvases.filter((canvas) => !canvas.role || canvas.role === 'owner')
  )
  const sharedCanvases = $derived(
    canvases.filter((canvas) => canvas.role && canvas.role !== 'owner')
  )
  let isLoading = $state(false)
  let isCreating = $state(false)
  let isDeleteDialogOpen = $state(false)
  let deleteTarget = $state<Canvas | null>(null)
  let isDeletingId = $state<string | null>(null)
  let error = $state<string | null>(null)

  function formatCanvasDate(dateString: string | null | undefined): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  async function loadCanvases() {
    if (!session.data?.user) {
      canvases = []
      isLoading = false
      return
    }

    isLoading = true
    error = null

    try {
      const response = await listCanvases()
      canvases = response.items
    } catch (nextError) {
      error = nextError instanceof Error ? nextError.message : 'Failed to load canvases.'
    } finally {
      isLoading = false
    }
  }

  async function handleCreate() {
    if (!session.data?.user) {
      window.location.assign('/login?redirect=%2F')
      return
    }

    isCreating = true
    error = null

    try {
      const response = await createCanvas({ title: 'Untitled' })
      window.location.assign(`/canvas/${response.item.id}`)
    } catch (nextError) {
      error = nextError instanceof Error ? nextError.message : 'Failed to create canvas.'
    } finally {
      isCreating = false
    }
  }

  function handleDeleteRequest(canvas: Canvas) {
    deleteTarget = canvas
    error = null
    isDeleteDialogOpen = true
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return
    }

    const canvas = deleteTarget
    isDeletingId = canvas.id
    error = null

    try {
      await deleteCanvas(canvas.id)
      canvases = canvases.filter((entry) => entry.id !== canvas.id)
      deleteTarget = null
      isDeleteDialogOpen = false
    } catch (nextError) {
      error = nextError instanceof Error ? nextError.message : 'Failed to delete canvas.'
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
    if (session.data?.user?.id) {
      void loadCanvases()
    } else {
      canvases = []
    }
  })
</script>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
  <div class="grid gap-3">
    <p class="m-0 text-sm font-bold uppercase tracking-[0.2em] text-primary">Canvas</p>
    <h1 class="m-0 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
      Recent canvases
    </h1>
    <p class="m-0 max-w-3xl text-lg leading-8 text-muted-foreground">
      Create a new canvas or reopen a previous one to keep drawing.
    </p>
  </div>

  {#if error}
    <div class="surface-card border-destructive/30 p-4 text-sm text-destructive">
      {error}
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          <Plus class="size-6 text-muted-foreground transition group-hover:text-primary" />
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
        <div class="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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
        <a
          href={`/canvas/${canvas.id}`}
          out:scale={{ duration: 200, start: 0.92, opacity: 0 }}
          animate:flip={{ duration: 250 }}
          class="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md"
        >
          <button
            type="button"
            class="absolute right-2 top-2 z-10 hidden size-8 items-center justify-center rounded-lg bg-card/95 text-muted-foreground opacity-0 shadow-md transition hover:bg-destructive/10 hover:text-destructive md:flex md:pointer-events-none md:group-focus-within:pointer-events-auto md:group-hover:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:opacity-100"
            onclick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              handleDeleteRequest(canvas)
            }}
            title="Delete canvas"
          >
            <Trash2 class="size-4" />
          </button>

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
      {/each}
    {/if}
  </div>

  {#if !isLoading && sharedCanvases.length > 0}
    <div class="grid gap-4">
      <h2 class="m-0 text-2xl font-semibold tracking-tight text-foreground">Shared with me</h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {#each sharedCanvases as canvas (canvas.id)}
          <a
            href={`/canvas/${canvas.id}`}
            out:scale={{ duration: 200, start: 0.92, opacity: 0 }}
            animate:flip={{ duration: 250 }}
            class="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/50 hover:shadow-md"
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
          </a>
        {/each}
      </div>
    </div>
  {/if}

  {#if !isLoading && session.data?.user && canvases.length === 0}
    <div class="py-12 text-center text-muted-foreground">
      No canvases yet. Create your first one to get started.
    </div>
  {/if}
</section>

<Modal
  bind:open={isDeleteDialogOpen}
  title="Delete canvas"
  eyebrow="Confirm action"
  widthClass="max-w-md"
>
  <div class="grid gap-6">
    <p class="m-0 text-sm leading-6 text-muted-foreground">
      Delete
      <span class="font-semibold text-foreground">{deleteTarget?.title ?? 'this canvas'}</span>?
      This action cannot be undone.
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
        class="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
