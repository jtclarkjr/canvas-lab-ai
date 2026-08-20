<script lang="ts">
  import Skeleton from '../../feedback/Skeleton.svelte'

  let { animated = true } = $props<{ animated?: boolean }>()
</script>

<div class="grid max-w-md gap-5 p-6">
  <div class="flex items-center gap-3">
    <Skeleton shape="circle" class="size-12" {animated} />
    <div class="flex-1 space-y-2">
      <Skeleton shape="text" class="w-2/5" {animated} />
      <Skeleton shape="text" class="h-3 w-4/5 opacity-70" {animated} />
    </div>
  </div>
  <Skeleton class="h-24 w-full" {animated} label="Loading preview" />
</div>
