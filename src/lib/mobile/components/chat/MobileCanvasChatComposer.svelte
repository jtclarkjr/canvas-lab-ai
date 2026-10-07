<script lang="ts">
  import {
    ChatComposer,
    type ChatComposerProps
  } from '#lib/components/shared/chat/index.js'

  let props: Omit<ChatComposerProps, 'density' | 'className'> = $props()
</script>

<ChatComposer {...props} density="touch" />
