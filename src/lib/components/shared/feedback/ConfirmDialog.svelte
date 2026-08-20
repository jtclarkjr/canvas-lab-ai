<script lang="ts">
  import { Button, Dialog } from '$lib/components/ui'

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

<Dialog bind:open {title} widthClass="max-w-sm">
  <p class="text-sm text-muted-foreground">{message}</p>

  <div class="mt-6 flex justify-end gap-2">
    <Button variant="outline" onclick={() => (open = false)}>
      {cancelLabel}
    </Button>
    <Button
      variant={destructive ? 'destructive' : 'primary'}
      onclick={handleConfirm}
    >
      {confirmLabel}
    </Button>
  </div>
</Dialog>
