<script lang="ts">
  import { Dialog as Modal, Button } from '$lib/components/ui'

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
      <Button
        variant="outline"
        onclick={() => {
          open = false
        }}
        disabled={deleting}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        loading={deleting}
        onclick={() => void onConfirm()}
        disabled={!canvas || deleting}
      >
        Delete canvas
      </Button>
    </div>
  </div>
</Modal>
