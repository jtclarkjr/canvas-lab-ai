<script lang="ts">
  import CanvasTilePreview from '../CanvasTilePreview.svelte'
  import { ownerCanvas } from './fixtures'

  let { withImage = false } = $props<{ withImage?: boolean }>()
</script>

<div class="h-72 w-64 overflow-hidden rounded-lg border border-border">
  <CanvasTilePreview
    canvas={withImage
      ? {
          ...ownerCanvas,
          iconUrl:
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23ede9fe"/%3E%3Ccircle cx="400" cy="300" r="120" fill="%237c3aed"/%3E%3C/svg%3E'
        }
      : ownerCanvas}
  />
</div>
