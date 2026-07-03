<script lang="ts">
  import Modal from '$lib/components/shared/Modal.svelte'
  import type { Canvas } from '$lib/canvas/schema'

  let {
    open = $bindable(false),
    canvas,
    deleting,
    onConfirm
  } = $props<{
    open?: boolean
    canvas: Canvas | null
    deleting: boolean
    onConfirm: () => void | Promise<void>
  }>()
</script>

<Modal
  bind:open
  title="Delete canvas"
  eyebrow="Confirm action"
  widthClass="max-w-md"
>
  <div class="grid gap-6">
    <p class="m-0 text-sm leading-6 text-muted-foreground">
      Delete
      <span class="font-semibold text-foreground"
        >{canvas?.title ?? 'this canvas'}</span
      >? This action cannot be undone.
    </p>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-secondary"
        onclick={() => {
          open = false
        }}
        disabled={deleting}
      >
        Cancel
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={() => void onConfirm()}
        disabled={!canvas || deleting}
      >
        {#if deleting}
          Deleting...
        {:else}
          Delete canvas
        {/if}
      </button>
    </div>
  </div>
</Modal>
