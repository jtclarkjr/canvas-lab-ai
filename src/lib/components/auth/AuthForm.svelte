<script lang="ts">
  import { slide } from 'svelte/transition'
  import PlatformIcons from '$lib/components/shared/PlatformIcons.svelte'
  import {
    signInWithEmail,
    signInWithOAuth,
    signUpWithEmail
  } from '$lib/auth/session-service'
  import type { AuthConfig } from '$lib/server/types'

  type AuthMode = 'sign-in' | 'sign-up'

  let {
    authConfig,
    redirectTo = '/',
    onSuccess
  } = $props<{
    authConfig: AuthConfig
    redirectTo?: string
    onSuccess?: () => void
  }>()

  let mode = $state<AuthMode>('sign-in')
  let name = $state('')
  let email = $state('')
  let password = $state('')
  let error = $state<string | null>(null)
  let message = $state<string | null>(null)
  let isSubmitting = $state(false)

  const modeThumbStyle = $derived(
    `transform: translateX(${mode === 'sign-up' ? '100%' : '0'});`
  )

  function setMode(nextMode: AuthMode) {
    mode = nextMode
    error = null
    message = null
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    error = null
    message = null

    if (!authConfig.configured) {
      error = 'Supabase auth is not configured.'
      return
    }

    if (!authConfig.providers.email) {
      error = 'Email authentication is disabled.'
      return
    }

    isSubmitting = true

    try {
      if (mode === 'sign-in') {
        const result = await signInWithEmail(email.trim(), password)
        if (result.error) {
          error = result.error.message
          return
        }

        onSuccess?.()
        window.location.assign(redirectTo)
        return
      }

      const result = await signUpWithEmail(
        email.trim(),
        password,
        name.trim() || email.trim().split('@')[0] || 'User'
      )

      if (result.error) {
        error = result.error.message
        return
      }

      if (result.data?.session) {
        onSuccess?.()
        window.location.assign(redirectTo)
        return
      }

      message = 'Account created. Check your email to confirm your sign-in.'
      mode = 'sign-in'
    } finally {
      isSubmitting = false
    }
  }

  async function handleSso(provider: 'github' | 'google' | 'apple') {
    error = null
    message = null
    isSubmitting = true

    try {
      const result = await signInWithOAuth(provider, redirectTo)
      if (result.error) {
        error = result.error.message
      }
    } finally {
      isSubmitting = false
    }
  }
</script>

{#if !authConfig.configured}
  <div class="grid gap-3 text-sm text-muted-foreground">
    <p class="m-0">Supabase auth is not configured for this environment.</p>
    <p class="m-0">
      Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VITE_SUPABASE_URL`, and
      `VITE_SUPABASE_PUBLISHABLE_KEY`.
    </p>
  </div>
{:else}
  <div class="grid gap-4">
    {#if authConfig.providers.github || authConfig.providers.google || authConfig.providers.apple}
      <div class="grid gap-2">
        {#if authConfig.providers.github}
          <button
            class="flex items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
            onclick={() => void handleSso('github')}
            disabled={isSubmitting}
          >
            <PlatformIcons provider="github" size="sm" />
            <span>Continue with GitHub</span>
          </button>
        {/if}
        {#if authConfig.providers.google}
          <button
            class="flex items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
            onclick={() => void handleSso('google')}
            disabled={isSubmitting}
          >
            <PlatformIcons provider="google" size="sm" />
            <span>Continue with Google</span>
          </button>
        {/if}
        {#if authConfig.providers.apple}
          <button
            class="flex items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
            onclick={() => void handleSso('apple')}
            disabled={isSubmitting}
          >
            <PlatformIcons provider="apple" size="sm" />
            <span>Continue with Apple</span>
          </button>
        {/if}
      </div>
    {/if}

    {#if authConfig.providers.email}
      {#if authConfig.providers.github || authConfig.providers.google || authConfig.providers.apple}
        <div class="flex items-center gap-3">
          <div class="h-px flex-1 bg-border/70"></div>
          <span class="text-xs text-muted-foreground">or</span>
          <div class="h-px flex-1 bg-border/70"></div>
        </div>
      {/if}

      <div
        class="relative grid w-full grid-cols-2 rounded-full border border-border bg-secondary p-1"
      >
        <span
          class="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-primary shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={modeThumbStyle}
          aria-hidden="true"
        ></span>
        <button
          type="button"
          class={`relative z-10 flex h-9 min-w-0 items-center justify-center rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
            mode === 'sign-in'
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={mode === 'sign-in'}
          onclick={() => {
            setMode('sign-in')
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          class={`relative z-10 flex h-9 min-w-0 items-center justify-center rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
            mode === 'sign-up'
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={mode === 'sign-up'}
          onclick={() => {
            setMode('sign-up')
          }}
        >
          Create Account
        </button>
      </div>

      <form class="grid gap-3" onsubmit={handleSubmit}>
        {#if mode === 'sign-up'}
          <div transition:slide={{ duration: 200 }}>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-foreground">Name</span>
              <input
                bind:value={name}
                class="rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:border-primary"
                placeholder="Jane Doe"
                autocomplete="name"
              />
            </label>
          </div>
        {/if}

        <label class="grid gap-2">
          <span class="text-sm font-medium text-foreground">Email</span>
          <input
            bind:value={email}
            class="rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:border-primary"
            placeholder="you@example.com"
            autocomplete="email"
            type="email"
            required
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-foreground">Password</span>
          <input
            bind:value={password}
            class="rounded-2xl border border-input bg-card px-4 py-3 outline-none focus:border-primary"
            placeholder="At least 8 characters"
            autocomplete={mode === 'sign-in'
              ? 'current-password'
              : 'new-password'}
            type="password"
            minlength="8"
            required
          />
        </label>

        <button
          type="submit"
          class="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {#if isSubmitting}
            {mode === 'sign-in' ? 'Signing In...' : 'Creating Account...'}
          {:else}
            {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          {/if}
        </button>
      </form>
    {/if}

    {#if error}
      <p class="m-0 text-sm text-destructive" role="alert">{error}</p>
    {/if}
    {#if message}
      <p class="m-0 text-sm text-muted-foreground" role="status">{message}</p>
    {/if}
  </div>
{/if}
