<script lang="ts">
  import Modal from '$lib/components/shared/Modal.svelte'

  let {
    open = $bindable(false),
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    destructive = true,
    onConfirm
  } = $props<{
    open?: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    onConfirm: () => void
  }>()

  function handleConfirm() {
    open = false
    onConfirm()
  }
</script>

<Modal bind:open {title} widthClass="max-w-sm">
  <p class="text-sm text-muted-foreground">{message}</p>

  <div class="mt-6 flex justify-end gap-2">
    <button
      type="button"
      class="rounded-full border border-border/60 px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
      onclick={() => (open = false)}
    >
      {cancelLabel}
    </button>
    <button
      type="button"
      class={`rounded-full px-4 py-2 text-sm font-medium text-white transition ${
        destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:opacity-90'
      }`}
      onclick={handleConfirm}
    >
      {confirmLabel}
    </button>
  </div>
</Modal>
