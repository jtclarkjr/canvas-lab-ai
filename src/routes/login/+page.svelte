<script lang="ts">
  import { page } from '$app/state'
  import { isAnonymousUser } from '#lib/auth/anonymous.js'
  import AuthForm from '#lib/components/auth/AuthForm.svelte'
  import type { AuthConfig } from '#lib/server/types.js'
  import { session } from '#lib/stores/shared/session.svelte.js'
  import { sanitizeRedirectTarget } from '#lib/utils.js'

  let { data } = $props<{
    data: {
      authConfig: AuthConfig
    }
  }>()

  const redirectTo = $derived(
    sanitizeRedirectTarget(page.url.searchParams.get('redirect'))
  )
  let hasRedirected = $state(false)

  $effect(() => {
    const user = session.data?.user
    if (hasRedirected || session.isPending || !user || isAnonymousUser(user)) {
      return
    }

    hasRedirected = true
    window.location.replace(redirectTo)
  })
</script>

<main class="flex min-h-screen items-center justify-center px-4">
  <div class="surface-card w-full max-w-md p-6">
    <div class="mb-5 grid gap-1">
      <h1 class="m-0 text-2xl font-semibold text-foreground">Welcome</h1>
      <p class="m-0 text-sm text-muted-foreground">
        Sign in or create an account to access your canvases.
      </p>
    </div>
    <AuthForm authConfig={data.authConfig} {redirectTo} />
    <p class="mt-5 mb-0 text-center text-xs leading-5 text-muted-foreground">
      By signing in or creating an account, you agree to our
      <a
        href="/terms-of-service"
        class="underline underline-offset-2 transition hover:text-foreground"
      >
        Terms of Service
      </a>,
      <a
        href="/usage-policy"
        class="underline underline-offset-2 transition hover:text-foreground"
      >
        Usage Policy
      </a>, and
      <a
        href="/privacy-policy"
        class="underline underline-offset-2 transition hover:text-foreground"
      >
        Privacy Policy
      </a>.
    </p>
  </div>
</main>
