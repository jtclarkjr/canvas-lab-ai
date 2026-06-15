<script lang="ts">
  import AuthForm from '$lib/components/auth/AuthForm.svelte'
  import Modal from '$lib/components/shared/Modal.svelte'
  import type { AuthConfig } from '$lib/server/types'

  let {
    open = $bindable(false),
    authConfig,
    redirectTo = '/'
  } = $props<{
    open?: boolean
    authConfig: AuthConfig
    redirectTo?: string
  }>()
</script>

<Modal bind:open title="Welcome" eyebrow="" widthClass="max-w-md">
  <AuthForm
    {authConfig}
    {redirectTo}
    onSuccess={() => {
      open = false
    }}
  />
</Modal>
