<script lang="ts">
  import {
    ChatComposer,
    type ChatComposerProps
  } from '$lib/components/shared/chat'

  let props: Omit<ChatComposerProps, 'density'> = $props()
</script>

<ChatComposer {...props} density="compact" />
