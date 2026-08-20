<script lang="ts">
  import { onMount } from 'svelte'
  import ToastViewport from '../../feedback/ToastViewport.svelte'
  import { toast } from '$lib/stores/shared/toast.svelte'

  let { variant = 'default', withAction = true } = $props<{
    variant?: 'default' | 'error'
    withAction?: boolean
  }>()

  let actionCount = $state(0)

  onMount(() => {
    const id = toast.show(
      {
        title: variant === 'error' ? 'Upload failed' : 'Canvas saved',
        description:
          variant === 'error'
            ? 'Try a smaller image.'
            : 'Your latest changes are available.',
        variant,
        action: withAction
          ? { label: 'Undo', onClick: () => (actionCount += 1) }
          : undefined
      },
      0
    )

    return () => toast.dismiss(id)
  })
</script>

<div class="min-h-48 p-6">
  <p data-testid="action-count">Actions: {actionCount}</p>
  <ToastViewport />
</div>
