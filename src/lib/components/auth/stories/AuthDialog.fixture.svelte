<script lang="ts">
  import { Button } from '$lib/components/ui'
  import AuthDialog from '../AuthDialog.svelte'

  let { initialOpen = true } = $props<{ initialOpen?: boolean }>()
  let open = $state(false)

  $effect(() => {
    open = initialOpen
  })
</script>

<div class="flex min-h-48 items-center justify-center p-6">
  <Button onclick={() => (open = true)}>Open authentication</Button>
</div>

<AuthDialog
  bind:open
  redirectTo="/home"
  authConfig={{
    configured: true,
    providers: { email: true, github: true, google: true, apple: false }
  }}
/>
