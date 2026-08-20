<script lang="ts">
  import { ImageOff, Upload } from 'lucide-svelte'
  import { removeCanvasIcon, uploadCanvasIcon } from '$lib/canvas/api'
  import { Button, Dialog as Modal } from '$lib/components/ui'

  import type { Canvas } from '$lib/canvas/schema'

  let {
    open = $bindable(false),
    canvas,
    onChanged
  } = $props<{
    open?: boolean
    canvas: Canvas | null
    onChanged: (canvas: Canvas) => void | Promise<void>
  }>()

  let selectedFile = $state<File | null>(null)
  let selectedPreviewUrl = $state<string | null>(null)
  let error = $state<string | null>(null)
  let uploading = $state(false)
  let removing = $state(false)
  let isDragOver = $state(false)
  let fileInputEl = $state<HTMLInputElement | null>(null)
  const isBusy = $derived(uploading || removing)

  function clearSelection() {
    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl)
    }

    selectedFile = null
    selectedPreviewUrl = null
    error = null
    isDragOver = false

    if (fileInputEl) {
      fileInputEl.value = ''
    }
  }

  function setSelectedFile(file: File | null) {
    clearSelection()

    if (!file) {
      return
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      error = 'Upload a PNG, JPEG, or WebP image.'
      return
    }

    if (file.size <= 0) {
      error = 'Upload an image file.'
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      error = 'Keep canvas icons under 5MB.'
      return
    }

    selectedFile = file
    selectedPreviewUrl = URL.createObjectURL(file)
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement)) {
      return
    }

    setSelectedFile(input.files?.[0] ?? null)
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    if (!isBusy) {
      isDragOver = true
    }
  }

  function handleDragLeave() {
    isDragOver = false
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDragOver = false

    if (isBusy) {
      return
    }

    setSelectedFile(event.dataTransfer?.files?.[0] ?? null)
  }

  async function handleUpload() {
    if (!canvas || !selectedFile || isBusy) {
      return
    }

    uploading = true
    error = null

    try {
      const response = await uploadCanvasIcon(canvas.id, selectedFile)
      await onChanged(response.item)
      open = false
      clearSelection()
    } catch (nextError) {
      error =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to upload canvas icon.'
    } finally {
      uploading = false
    }
  }

  async function handleRemove() {
    if (!canvas?.iconPath || isBusy) {
      return
    }

    removing = true
    error = null

    try {
      const response = await removeCanvasIcon(canvas.id)
      await onChanged(response.item)
      open = false
      clearSelection()
    } catch (nextError) {
      error =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to remove canvas icon.'
    } finally {
      removing = false
    }
  }

  $effect(() => {
    if (!open && !isBusy) {
      clearSelection()
    }
  })
</script>

<Modal
  bind:open
  title="Canvas icon"
  eyebrow={canvas?.title ?? 'Canvas'}
  widthClass="max-w-md"
  showClose={!isBusy}
>
  <div class="grid gap-5">
    <label
      class={`block cursor-pointer overflow-hidden rounded-lg border border-dashed p-3 transition ${isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-background/40 hover:border-primary/50'}`}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
    >
      <input
        bind:this={fileInputEl}
        type="file"
        class="sr-only"
        accept="image/png,image/jpeg,image/webp"
        disabled={isBusy}
        onchange={handleFileChange}
      />
      <span
        class="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground"
      >
        {#if selectedPreviewUrl}
          <img
            src={selectedPreviewUrl}
            alt="Selected canvas icon preview"
            class="h-full w-full object-cover"
          />
        {:else if canvas?.iconUrl}
          <img src={canvas.iconUrl} alt="" class="h-full w-full object-cover" />
        {:else}
          <span class="flex flex-col items-center gap-2">
            <Upload class="size-8" aria-hidden="true" />
            <span class="text-sm font-semibold">Choose image</span>
          </span>
        {/if}
      </span>
    </label>

    <div class="grid gap-2">
      <p class="m-0 text-sm text-muted-foreground">
        PNG, JPEG, or WebP. Maximum 5MB.
      </p>
      {#if selectedFile}
        <p class="m-0 truncate text-sm font-medium text-foreground">
          {selectedFile.name}
        </p>
      {/if}
      {#if error}
        <p class="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      {/if}
    </div>

    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      {#if canvas?.iconPath}
        <Button
          variant="outline"
          class="border-destructive/30 text-destructive hover:bg-destructive/10"
          loading={removing}
          onclick={() => void handleRemove()}
          disabled={isBusy}
        >
          {#if !removing}
            <ImageOff class="size-4" aria-hidden="true" />
          {/if}
          Remove icon
        </Button>
      {/if}
      <div
        class="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row sm:justify-end"
      >
        <Button
          variant="outline"
          onclick={() => {
            open = false
          }}
          disabled={isBusy}
        >
          Cancel
        </Button>
        <Button
          loading={uploading}
          onclick={() => void handleUpload()}
          disabled={!selectedFile || isBusy}
        >
          Upload icon
        </Button>
      </div>
    </div>
  </div>
</Modal>
