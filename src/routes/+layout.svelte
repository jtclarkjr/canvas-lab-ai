<script lang="ts">
  import '../app.css'
  import favicon from '$lib/assets/favicon.svg'
  import { dev } from '$app/environment'
  import { injectAnalytics } from '@vercel/analytics/sveltekit'
  import AuthControls from '$lib/components/auth/AuthControls.svelte'
  import { session } from '$lib/stores/session.svelte'
  import { theme } from '$lib/stores/theme.svelte'
  import { page } from '$app/state'
  import { onMount } from 'svelte'

  injectAnalytics({ mode: dev ? 'development' : 'production' })

  let { children } = $props<{
    children: () => unknown
  }>()

  const hideHeader = $derived(
    page.url.pathname === '/login' || page.url.pathname.startsWith('/canvas/')
  )

  onMount(() => {
    void session.init()
    return theme.init()
  })
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Canvas App</title>
</svelte:head>

{#if hideHeader}
  {@render children()}
{:else}
  <div class="min-h-screen">
    <header class="relative z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div
        class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <a href="/" class="text-sm font-bold tracking-[0.02em] text-foreground">Canvas App</a>
        <AuthControls />
      </div>
    </header>

    <main>
      {@render children()}
    </main>
  </div>
{/if}
